import json
import collections
from typing import Dict, List, Set, Union, Tuple
import traceback

from sqllineage.runner import LineageRunner
from sqllineage.core.models import Table, Column

# --- 布局常量 (保持不变) ---
NODE_BASE_HEIGHT = 60  # 节点基础高度 (标题 + 少量内边距)
FIELD_HEIGHT = 25  # 每个字段的高度
NODE_VERTICAL_SPACING = 20  # 同一列中节点之间的垂直间距
LAYER_HORIZONTAL_SPACING = 850  # 不同列之间节点的水平间距 (Origin 和 RS 之间)
START_X = 20  # 起始 X 坐标
START_Y = 20  # 起始 Y 坐标


def get_lineage_json_from_parsed_output(
        sql_query: str,
        filter_ctes: bool = True  # 是否过滤掉CTE（只显示物理中间表）
) -> Dict[str, List[Dict]]:
    """
    解析 SQL 查询，使用 sqllineage 的底层 API (LineageRunner)，
    生成符合指定 JSON 格式的血缘关系数据。
    Args:
        sql_query (str): 要解析的 SQL 查询字符串。
        filter_ctes (bool): 是否过滤掉 CTE（即名称中不含 '.' 的中间表），只显示物理中间表。
                            如果为 True，则过滤掉 CTE，只显示物理中间表。
                            如果为 False，则显示所有中间表（CTE 和物理中间表）。
    Returns:
        dict: 包含 'edges' 和 'nodes' 列表的字典。
    """
    try:
        # 修改：为每个SQL语句分别处理源表和目标表
        statements = sql_query.strip().split(';')
        statements = [stmt.strip() for stmt in statements if stmt.strip()]
        
        # 存储每个语句的血缘关系
        statement_lineages = []
        for stmt in statements:
            if not stmt:
                continue
                
            runner = LineageRunner(
                sql=stmt,
                verbose=False
            )
            
            # 获取当前语句的源表和目标表
            current_source_tables = {str(t) for t in runner.source_tables}
            current_target_tables = {str(t) for t in runner.target_tables}
            
            # 将当前语句的血缘信息添加到列表中
            statement_lineages.append({
                'sources': current_source_tables,
                'targets': current_target_tables,
                'runner': runner
            })

        # 合并所有语句的血缘信息
        all_source_tables = set()
        all_target_tables = set()
        all_intermediate_tables = set()
        
        for lineage in statement_lineages:
            all_source_tables.update(lineage['sources'])
            all_target_tables.update(lineage['targets'])
            all_intermediate_tables.update({str(t) for t in lineage['runner'].intermediate_tables})

        # 处理表的类型
        # 如果一个表在某个语句中是目标表，在另一个语句中是源表，将其标记为中间表
        tables_as_both = all_source_tables.intersection(all_target_tables)
        if tables_as_both:
            all_source_tables.difference_update(tables_as_both)
            all_target_tables.difference_update(tables_as_both)
            all_intermediate_tables.update(tables_as_both)

        # 更新原始的表集合
        source_tables_names = all_source_tables
        target_tables_names = all_target_tables
        
        # 重置血缘边收集
        raw_edges = []
        all_fields_in_raw_lineage = collections.defaultdict(set)
        
        # 从所有语句中收集列级血缘
        for lineage in statement_lineages:
            runner = lineage['runner']
            current_sources = lineage['sources']
            current_targets = lineage['targets']
            
            for col_lineage_path_tuple in list(runner.get_column_lineage()):
                # 处理字段收集
                for col_obj in col_lineage_path_tuple:
                    if col_obj.parent is not None:
                        table_name = str(col_obj.parent)
                        field_name = str(col_obj).split('.')[-1]
                        all_fields_in_raw_lineage[table_name].add(field_name)
                
                # 处理边收集
                if len(col_lineage_path_tuple) >= 2:
                    prev_table = None
                    for col_obj in col_lineage_path_tuple:
                        if col_obj.parent is not None:
                            current_table = str(col_obj.parent)
                            current_field = str(col_obj).split('.')[-1]
                            
                            if prev_table is not None and prev_table != current_table:
                                # 确保不创建自引用边
                                if prev_table != current_table:
                                    raw_edges.append((prev_table, prev_field, current_table, current_field))
                            
                            prev_table = current_table
                            prev_field = current_field

        # --- 动态识别所有中间表 (包括 CTE 和物理中间表) ---
        # 从所有在列血缘中出现的表中，排除 sqllineage 明确识别的源表和目标表，剩下的就是中间表
        all_tables_in_lineage_fields: Set[str] = set(all_fields_in_raw_lineage.keys())
        all_discovered_intermediates: Set[str] = (
                all_tables_in_lineage_fields - source_tables_names - target_tables_names
        )
        # 确保 sqllineage 明确识别的中间表也被包含（尽管对于 CTE 可能为空）
        all_discovered_intermediates.update({str(t) for t in runner.intermediate_tables})

        # 根据 filter_ctes 参数，确定最终要"显示"的中间表集合（用于节点列表和层级计算）
        intermediate_tables_to_display: Set[str] = set()
        if filter_ctes:
            # 只显示名称中包含 '.' 的中间表（假设为物理表/视图）
            intermediate_tables_to_display = {
                t for t in all_discovered_intermediates if '.' in t
            }
        else:
            # 显示所有中间表（包括 CTE 和物理中间表）
            intermediate_tables_to_display = all_discovered_intermediates

        # --- 根据 filter_ctes 参数决定血缘图的构建方式 ---
        # 重新设计：构建完整的血缘图，然后根据过滤条件处理
        
        # 1. 确定要渲染的表集合（用于节点列表）
        tables_to_render_set = set()
        tables_to_render_set.update(source_tables_names)
        tables_to_render_set.update(intermediate_tables_to_display)  # 包含根据filter_ctes过滤后的中间表
        tables_to_render_set.update(target_tables_names)
        
        # 2. 构建完整的血缘图（包括所有表和字段）
        adj_map = {}  # (table, field) -> [(table, field), ...]
        rev_adj = {}  # (table, field) -> [(table, field), ...]
        
        for from_t, from_f, to_t, to_f in raw_edges:
            # 正向邻接表
            key = (from_t, from_f)
            if key not in adj_map:
                adj_map[key] = []
            adj_map[key].append((to_t, to_f))
            
            # 反向邻接表
            key = (to_t, to_f)
            if key not in rev_adj:
                rev_adj[key] = []
            rev_adj[key].append((from_t, from_f))
        
        # 3. 定义辅助函数（在使用之前定义）
        def find_visible_node_pairs(from_tuple, to_tuple, visible_tables, adj_map, rev_adj):
            """找到两个节点之间的所有可见节点对"""
            from_table, from_field = from_tuple
            to_table, to_field = to_tuple
            
            # 如果两端都在可见节点集合中，直接返回
            if from_table in visible_tables and to_table in visible_tables:
                return {(from_table, from_field, to_table, to_field)}
            
            # 如果只有一端在可见节点集合中，需要找到另一端的可达可见节点
            pairs = set()
            
            if from_table in visible_tables:
                # from_table可见，需要找到to_table可达的可见节点
                visible_targets = find_reachable_visible_nodes(to_tuple, visible_tables, adj_map)
                for target_table, target_field in visible_targets:
                    pairs.add((from_table, from_field, target_table, target_field))
            
            elif to_table in visible_tables:
                # to_table可见，需要找到from_table可达的可见节点
                visible_sources = find_reachable_visible_nodes(from_tuple, visible_tables, rev_adj)
                for source_table, source_field in visible_sources:
                    pairs.add((source_table, source_field, to_table, to_field))
            
            return pairs
        
        def find_reachable_visible_nodes(start_tuple, visible_tables, adj_map):
            """从起始节点找到所有可达的可见节点"""
            visited = set()
            visible_nodes = set()
            
            def dfs(current_tuple):
                if current_tuple in visited:
                    return
                visited.add(current_tuple)
                
                table, field = current_tuple
                if table in visible_tables:
                    visible_nodes.add(current_tuple)
                    return  # 找到可见节点就停止，避免继续深入
                
                # 继续搜索
                for next_tuple in adj_map.get(current_tuple, []):
                    dfs(next_tuple)
            
            dfs(start_tuple)
            return visible_nodes
        
        def find_reachable_sources(target_tuple, source_tables, rev_adj):
            """从目标表字段找到所有可达的源表字段"""
            visited = set()
            sources = set()
            
            def dfs(current_tuple):
                if current_tuple in visited:
                    return
                visited.add(current_tuple)
                
                table, field = current_tuple
                if table in source_tables:
                    sources.add(current_tuple)
                    return
                
                # 递归向上追溯
                for prev in rev_adj.get(current_tuple, []):
                    dfs(prev)
            
            dfs(target_tuple)
            return sources
        
        # 4. 根据过滤条件构建最终的边集合
        edges_to_render = set()
        
        # 显示中间表：保留所有原始边，但只显示过滤后的中间表
        for from_t, from_f, to_t, to_f in raw_edges:
            # 如果两端都在可见节点集合中，直接保留
            if from_t in tables_to_render_set and to_t in tables_to_render_set:
                edges_to_render.add((from_t, from_f, to_t, to_f))
            # 如果一端在可见节点集合中，另一端不在，需要找到可达的可见节点
            elif from_t in tables_to_render_set or to_t in tables_to_render_set:
                # 找到可达的可见节点对
                visible_pairs = find_visible_node_pairs(
                    (from_t, from_f), (to_t, to_f), 
                    tables_to_render_set, adj_map, rev_adj
                )
                edges_to_render.update(visible_pairs)
        
        # 5. 初始化字段映射（用于节点渲染）
        nodes_to_render_fields: Dict[str, Set[str]] = collections.defaultdict(set)
        for table, fields in all_fields_in_raw_lineage.items():
            if table in tables_to_render_set:  # 只包含要渲染的表
                nodes_to_render_fields[table].update(fields)
        
        # 将要渲染的边集合转换为列表
        edges_list_final = []
        # 创建一个集合来跟踪已经添加的边
        added_edges = set()
        
        # 排序以保持输出一致性
        for from_t, from_f, to_t, to_f in sorted(list(edges_to_render)):
            # 检查是否是自引用边
            if from_t != to_t:
                # 检查这条边是否已经添加过
                edge_key = (from_t, from_f, to_t, to_f)
                if edge_key not in added_edges:
                    edges_list_final.append({
                        "from": {"field": from_f, "name": from_t},
                        "to": {"field": to_f, "name": to_t}
                    })
                    added_edges.add(edge_key)

        # --- 生成节点并计算布局 ---
        nodes_list_final = []
        # 使用之前定义的 tables_to_render_set

        # 2. 构建表级图的邻接表和入度，用于分层
        table_graph_adj: Dict[str, Set[str]] = collections.defaultdict(set)
        table_graph_in_degree: Dict[str, int] = collections.defaultdict(int)
        for from_t, _, to_t, _ in edges_to_render:
            if from_t in tables_to_render_set and to_t in tables_to_render_set:
                table_graph_adj[from_t].add(to_t)
                table_graph_in_degree[to_t] += 1

        # === 新分层逻辑：Origin=0，Middle自动分层，RS=最右 ===
        table_display_layers: Dict[str, int] = {}
        # 1. Origin固定为0
        for table_name in tables_to_render_set:
            if table_name in source_tables_names:
                table_display_layers[table_name] = 0
            else:
                table_display_layers[table_name] = -1  # 未分配

        # 2. Middle自动分层（拓扑分层）
        changed = True
        while changed:
            changed = False
            for table_name in tables_to_render_set:
                if table_display_layers[table_name] == -1 and table_name not in target_tables_names:
                    # 找所有上游表
                    upstream_layers = []
                    for from_t, _, to_t, _ in edges_to_render:
                        if to_t == table_name and table_display_layers.get(from_t, -1) != -1:
                            upstream_layers.append(table_display_layers[from_t])
                    if upstream_layers:
                        table_display_layers[table_name] = max(upstream_layers) + 1
                        changed = True
        # 3. 目标表layer=Middle最大层+1
        max_middle_layer = max([l for t, l in table_display_layers.items() if t not in source_tables_names and t not in target_tables_names and l != -1], default=0)
        for table_name in tables_to_render_set:
            if table_name in target_tables_names:
                table_display_layers[table_name] = max_middle_layer + 1
        # === END ===

        # 5. 在每一层内部对表进行排序（按字段数量降序）
        tables_by_layer: Dict[int, List[str]] = collections.defaultdict(list)
        for table_name in tables_to_render_set:
            layer = table_display_layers[table_name]
            tables_by_layer[layer].append(table_name)

        # 对每一层的表进行排序（按字段数量降序）
        for layer in tables_by_layer:
            tables_by_layer[layer].sort(
                key=lambda t: (
                    -len(nodes_to_render_fields[t]),
                    t
                )
            )

        # 6. 计算每个表的具体位置
        for layer, tables in tables_by_layer.items():
            current_y = START_Y
            for table_name in tables:
                # 获取表的字段列表
                fields = sorted(list(nodes_to_render_fields[table_name]))
                # 确定表的类型
                table_type = (
                    "Origin" if table_name in source_tables_names
                    else "RS" if table_name in target_tables_names
                    else "Middle"
                )
                # 创建节点对象
                node = {
                    "name": table_name,
                    "type": table_type,
                    "fields": [{"name": f} for f in fields],
                    "left": START_X + layer * LAYER_HORIZONTAL_SPACING,
                    "top": current_y
                }
                nodes_list_final.append(node)
                # 更新下一个表的 Y 坐标
                current_y += NODE_BASE_HEIGHT + len(fields) * FIELD_HEIGHT + NODE_VERTICAL_SPACING

        # === 新增：强制排序nodes_list_final，保证Origin-Middle-RS顺序 ===
        type_order = {"Origin": 0, "Middle": 1, "RS": 2}
        nodes_list_final.sort(key=lambda n: (type_order.get(n["type"], 99), n["left"], n["top"]))
        # === END ===

        # 返回最终的血缘关系数据
        return {
            "nodes": nodes_list_final,
            "edges": edges_list_final
        }
    except Exception as e:
        print(f"Error in get_lineage_json_from_parsed_output: {str(e)}")
        traceback.print_exc()
        raise 