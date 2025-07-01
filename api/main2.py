import json
import collections
from typing import Dict, List, Set, Union, Tuple

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
        include_intermediate_tables: bool = True,
        filter_ctes: bool = True  # 是否过滤掉CTE（只显示物理中间表）
) -> Dict[str, List[Dict]]:
    """
    解析 SQL 查询，使用 sqllineage 的底层 API (LineageRunner)，
    生成符合指定 JSON 格式的血缘关系数据。
    Args:
        sql_query (str): 要解析的 SQL 查询字符串。
        include_intermediate_tables (bool): 是否在结果中包含中间表。
                                            如果为 True，根据 filter_ctes 决定显示哪些中间表。
                                            如果为 False，将折叠所有中间表，只显示源表和目标表之间的直接血缘。
        filter_ctes (bool): 仅当 include_intermediate_tables 为 True 时有效。
                            如果为 True，则过滤掉 CTE（即名称中不含 '.' 的中间表），只显示物理中间表。
                            如果为 False，则显示所有中间表（CTE 和物理中间表）。
    Returns:
        dict: 包含 'edges' 和 'nodes' 列表的字典。
    """
    runner = LineageRunner(
        sql=sql_query,
        verbose=False
    )
    # --- DEBUG PRINT: sqllineage 原始解析结果 ---
    print("\n--- DEBUG: sqllineage raw runner output ---")
    print(f"Source Tables: {[str(t) for t in runner.source_tables]}")
    print(f"Target Tables: {[str(t) for t in runner.target_tables]}")
    print(f"Intermediate Tables (from runner): {[str(t) for t in runner.intermediate_tables]}")

    raw_column_lineage_output = list(runner.get_column_lineage())  # Convert to list to print it
    print(f"Raw Column Lineage (from runner.get_column_lineage()):")
    for item in raw_column_lineage_output:
        # Format for better readability
        formatted_item = tuple(
            f"{str(col.parent)}.{str(col).split('.')[-1]}" if col.parent else str(col) for col in item)
        print(f"  {formatted_item}")
    print("------------------------------------------")
    # --- END DEBUG PRINT ---
    # 从 runner 对象直接获取表级血缘信息
    source_tables_names: Set[str] = {str(t) for t in runner.source_tables}
    target_tables_names: Set[str] = {str(t) for t in runner.target_tables}

    raw_edges: List[Tuple[str, str, str, str]] = []
    # all_fields_in_raw_lineage 将包含所有被 sqllineage 识别到的表及其字段，无论它们是否有血缘连接
    all_fields_in_raw_lineage: Dict[str, Set[str]] = collections.defaultdict(set)
    for col_lineage_path_tuple in raw_column_lineage_output:  # 使用捕获的列表
        # 遍历 col_lineage_path_tuple 中的所有 Column 对象，捕获其表和字段
        # 这样即使是孤立的列（元组长度为1），也能被记录下来
        for col_obj in col_lineage_path_tuple:
            if col_obj.parent is not None:
                table_name = str(col_obj.parent)
                field_name = str(col_obj).split('.')[-1]
                all_fields_in_raw_lineage[table_name].add(field_name)
        # 只有当元组长度 >= 2 时，才构成一个实际的血缘边
        if len(col_lineage_path_tuple) >= 2:
            for i in range(len(col_lineage_path_tuple) - 1):
                source_col = col_lineage_path_tuple[i]
                target_col = col_lineage_path_tuple[i + 1]
                from_table_name = str(source_col.parent) if source_col.parent is not None else ""
                to_table_name = str(target_col.parent) if target_col.parent is not None else ""
                from_field_name = str(source_col).split('.')[-1]
                to_field_name = str(target_col).split('.')[-1]
                if from_table_name and to_table_name:
                    raw_edges.append((from_table_name, from_field_name, to_table_name, to_field_name))
        else:
            # 打印警告，但不再跳过，因为其表和字段已被 all_fields_in_raw_lineage 捕获
            print(
                f"Warning: Column lineage item with length less than 2: {col_lineage_path_tuple}. Its table/field will be included but no direct edge will be formed from this item.")
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
    if include_intermediate_tables:
        if filter_ctes:
            # 只显示名称中包含 '.' 的中间表（假设为物理表/视图）
            intermediate_tables_to_display = {
                t for t in all_discovered_intermediates if '.' in t
            }
        else:
            # 显示所有中间表（包括 CTE 和物理中间表）
            intermediate_tables_to_display = all_discovered_intermediates
    # --- 根据 include_intermediate_tables 和 filter_ctes 参数决定血缘图的构建方式 ---
    edges_to_render: Set[Tuple[str, str, str, str]] = set()
    # nodes_to_render_fields 始终从 all_fields_in_raw_lineage 初始化，确保所有字段都被考虑
    nodes_to_render_fields: Dict[str, Set[str]] = collections.defaultdict(set)
    for table, fields in all_fields_in_raw_lineage.items():
        nodes_to_render_fields[table].update(fields)
    # 构建反向邻接表用于图遍历 (需要完整的中间路径信息，不受filter_ctes影响)
    rev_adj: Dict[Tuple[str, str], Set[Tuple[str, str]]] = collections.defaultdict(set)
    for from_t, from_f, to_t, to_f in raw_edges:
        rev_adj[(to_t, to_f)].add((from_t, from_f))
    if include_intermediate_tables and filter_ctes:
        # 如果只显示物理中间表，则需要特殊处理边的追溯，跳过 CTE

        # 辅助函数 (DFS) 查找最终源列，跳过被过滤的CTE
        def find_ultimate_sources_filtered(current_col_tuple: Tuple[str, str], visited: Set[Tuple[str, str]]) -> Set[
            Tuple[str, str]]:
            current_table, current_field = current_col_tuple
            if current_col_tuple in visited:
                return set()  # 避免循环
            visited.add(current_col_tuple)

            # 如果当前表是源表，则它是一个最终源
            if current_table in source_tables_names:
                return {current_col_tuple}

            # 如果当前表是物理中间表，则它是一个可显示的源
            if current_table in intermediate_tables_to_display:
                return {current_col_tuple}
            # 如果当前表是目标表，但不是源表，并且没有上游，则它可能是一个字面量或函数结果，
            # 或者是没有被识别为源表的外部输入，不应作为"源"
            # 或者它是一个被过滤掉的CTE，且没有上游了
            if not rev_adj.get(current_col_tuple) and (current_table not in source_tables_names) and (
                    current_table not in intermediate_tables_to_display):
                return set()

            # 递归查找其上游源
            sources_found = set()
            for prev_col_tuple in rev_adj.get(current_col_tuple, set()):
                sources_found.update(find_ultimate_sources_filtered(prev_col_tuple, visited.copy()))
            return sources_found

        # 遍历所有目标表和要显示的物理中间表，找到它们的最终源
        # 注意：这里只遍历目标表和要显示的中间表，因为我们只关心这些表的入度边
        for target_node_name in target_tables_names.union(intermediate_tables_to_display):
            for target_field_name in all_fields_in_raw_lineage.get(target_node_name, set()):
                target_col_tuple = (target_node_name, target_field_name)
                ultimate_sources = find_ultimate_sources_filtered(target_col_tuple, set())
                for src_table, src_field in ultimate_sources:
                    # 确保边只在要显示的节点之间
                    if src_table in source_tables_names or src_table in intermediate_tables_to_display:
                        edges_to_render.add((src_table, src_field, target_node_name, target_field_name))
    elif include_intermediate_tables and not filter_ctes:
        # 如果要显示所有中间表 (包括 CTE)，则直接使用所有原始边
        edges_to_render = set(raw_edges)
    else:  # include_intermediate_tables is False (默认行为：折叠所有中间表)
        # 辅助函数 (DFS) 查找最终源列 (不考虑任何中间表)
        def find_ultimate_sources_collapsed(current_col_tuple: Tuple[str, str], visited: Set[Tuple[str, str]]) -> Set[
            Tuple[str, str]]:
            current_table, current_field = current_col_tuple
            if current_col_tuple in visited:
                return set()  # 避免循环
            visited.add(current_col_tuple)

            if current_table in source_tables_names:
                return {current_col_tuple}
            if not rev_adj.get(current_col_tuple) and current_table not in source_tables_names:
                return set()

            sources_found = set()
            for prev_col_tuple in rev_adj.get(current_col_tuple, set()):
                sources_found.update(find_ultimate_sources_collapsed(prev_col_tuple, visited.copy()))
            return sources_found

        # 遍历所有目标表及其字段，找到它们的最终源
        for target_node_name in target_tables_names:
            for target_field_name in all_fields_in_raw_lineage.get(target_node_name, set()):
                target_col_tuple = (target_node_name, target_field_name)
                ultimate_sources = find_ultimate_sources_collapsed(target_col_tuple, set())
                for src_table, src_field in ultimate_sources:
                    edges_to_render.add((src_table, src_field, target_node_name, target_field_name))
    # 将要渲染的边集合转换为列表
    edges_list_final = []
    # 排序以保持输出一致性
    for from_t, from_f, to_t, to_f in sorted(list(edges_to_render)):
        edges_list_final.append({
            "from": {"field": from_f, "name": from_t},
            "to": {"field": to_f, "name": to_t}
        })
    # --- 生成节点并计算布局 ---
    nodes_list_final = []
    # 1. 确定要渲染的表集合
    tables_to_render_set = set()
    if include_intermediate_tables:
        tables_to_render_set.update(source_tables_names)
        tables_to_render_set.update(intermediate_tables_to_display)  # 包含根据filter_ctes过滤后的中间表
        tables_to_render_set.update(target_tables_names)
    else:
        tables_to_render_set.update(source_tables_names)
        tables_to_render_set.update(target_tables_names)
    # 这一步不再过滤，确保所有被识别的表（包括没有明确血缘的）都被考虑渲染
    # 如果一个表在 all_fields_in_raw_lineage 中没有字段，它的 fields 列表将是空的，这正是你想要的"没有依赖关系"的视觉表现。
    # 2. 构建表级图的邻接表和入度，用于分层
    table_graph_adj: Dict[str, Set[str]] = collections.defaultdict(set)
    table_graph_in_degree: Dict[str, int] = collections.defaultdict(int)
    table_display_layers: Dict[str, int] = {}  # 存储每个表的层级
    # 初始化所有要渲染的表的入度为0，层级为-1（未分配）
    for table_name in tables_to_render_set:
        table_graph_in_degree[table_name] = 0
        table_display_layers[table_name] = -1

        # 根据 edges_to_render 构建图的邻接表和入度
    for from_t, _, to_t, _ in edges_to_render:  # 使用 edges_to_render (Set of 4-tuples)
        if from_t in tables_to_render_set and to_t in tables_to_render_set:
            table_graph_adj[from_t].add(to_t)
            table_graph_in_degree[to_t] += 1
    # 3. 分配层级 (BFS 拓扑排序)
    queue_for_layering = collections.deque()
    # 将所有源表（入度为0的表，或明确的source_tables_names中的表）放入队列，并设置为第0层
    for table_name in tables_to_render_set:
        # 明确的源表，强制在第0层
        if table_name in source_tables_names:
            table_display_layers[table_name] = 0
            queue_for_layering.append(table_name)
        # 对于非源表但入度为0的表（可能是孤立的中间表或目标表），也放在第0层
        elif table_graph_in_degree[table_name] == 0:
            table_display_layers[table_name] = 0
            queue_for_layering.append(table_name)

    max_calculated_layer = 0  # 记录通过BFS计算出的最大层级
    processed_nodes_in_bfs = set()  # 避免重复处理节点，防止无限循环（针对循环依赖）
    while queue_for_layering:
        current_table = queue_for_layering.popleft()
        if current_table in processed_nodes_in_bfs:
            continue
        processed_nodes_in_bfs.add(current_table)
        current_layer = table_display_layers[current_table]
        max_calculated_layer = max(max_calculated_layer, current_layer)
        for downstream_table in table_graph_adj[current_table]:
            # 只有当目标表不是最终目标表时，才通过BFS更新其层级
            # 最终目标表会在后面被强制到最右侧层
            if downstream_table not in target_tables_names:
                # 如果下游表当前层级未设置或可以更深，则更新
                if table_display_layers[downstream_table] < current_layer + 1:
                    table_display_layers[downstream_table] = current_layer + 1
                    queue_for_layering.append(downstream_table)

    # 4. 强制目标表在最右侧层
    final_layer = max_calculated_layer + 1
    for table_name in target_tables_names:
        table_display_layers[table_name] = final_layer

    # 5. 在每一层内对表进行排序，以保持输出一致性
    tables_by_layer: Dict[int, List[str]] = collections.defaultdict(list)
    for table_name in tables_to_render_set:
        layer = table_display_layers[table_name]
        tables_by_layer[layer].append(table_name)
    for layer in tables_by_layer:
        tables_by_layer[layer].sort()  # 按表名字母顺序排序

    # 6. 计算每个表的垂直位置
    table_vertical_positions: Dict[str, int] = {}
    for layer in range(final_layer + 1):
        current_y = START_Y
        for table_name in tables_by_layer[layer]:
            # 计算表的高度（基础高度 + 字段数量 * 每个字段的高度）
            fields_count = len(nodes_to_render_fields[table_name])
            table_height = NODE_BASE_HEIGHT + fields_count * FIELD_HEIGHT
            # 分配垂直位置
            table_vertical_positions[table_name] = current_y
            # 更新下一个表的起始位置
            current_y += table_height + NODE_VERTICAL_SPACING

    # 7. 生成最终的节点列表
    for table_name in sorted(tables_to_render_set):  # 排序以保持输出一致性
        # 确定表的类型
        node_type = "Origin" if table_name in source_tables_names else (
            "Target" if table_name in target_tables_names else "Intermediate"
        )

        # 获取表的层级和垂直位置
        layer = table_display_layers[table_name]
        top = table_vertical_positions[table_name]

        # 计算水平位置
        left = START_X + layer * LAYER_HORIZONTAL_SPACING

        # 获取表的字段列表
        fields = [{"name": field_name} for field_name in sorted(nodes_to_render_fields[table_name])]

        # 创建节点对象
        node = {
            "name": table_name,
            "type": node_type,
            "left": left,
            "top": top,
            "fields": fields
        }
        nodes_list_final.append(node)

    # 返回最终结果
    return {
        "nodes": nodes_list_final,
        "edges": edges_list_final
    } 