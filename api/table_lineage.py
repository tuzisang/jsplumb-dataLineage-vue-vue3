from typing import Dict, List, Set, Union
from sqllineage.runner import LineageRunner
import traceback

# --- 布局常量 ---
NODE_BASE_HEIGHT = 60  # 节点基础高度
NODE_VERTICAL_SPACING = 20  # 同一列中节点之间的垂直间距
LAYER_HORIZONTAL_SPACING = 850  # 不同列之间节点的水平间距
START_X = 20  # 起始 X 坐标
START_Y = 20  # 起始 Y 坐标

def get_table_lineage_json(
        sql_query: str,
        filter_ctes: bool = True
) -> Dict[str, List[Dict]]:
    """
    解析 SQL 查询，使用 sqllineage 生成表级血缘关系数据。
    
    Args:
        sql_query (str): 要解析的 SQL 查询字符串
        filter_ctes (bool): 是否过滤 CTE（只显示物理表）
    
    Returns:
        dict: 包含 'edges' 和 'nodes' 列表的字典
    """
    try:
        # 分割多个SQL语句
        statements = sql_query.strip().split(';')
        statements = [stmt.strip() for stmt in statements if stmt.strip()]
        
        # 存储所有表的信息
        all_source_tables = set()
        all_target_tables = set()
        all_intermediate_tables = set()
        edges_set = set()  # 用于存储唯一的边
        
        # 处理每个SQL语句
        for stmt in statements:
            if not stmt:
                continue
                
            runner = LineageRunner(sql=stmt, verbose=False)
            
            # 收集源表和目标表
            current_sources = {str(t) for t in runner.source_tables}
            current_targets = {str(t) for t in runner.target_tables}
            current_intermediates = {str(t) for t in runner.intermediate_tables}
            
            # 更新全局集合
            all_source_tables.update(current_sources)
            all_target_tables.update(current_targets)
            all_intermediate_tables.update(current_intermediates)
            
            # 为每个目标表创建与其源表之间的边
            for target in current_targets:
                for source in current_sources:
                    edges_set.add((source, target))
        
        # 处理表的类型
        # 如果一个表在某个语句中是目标表，在另一个语句中是源表，将其标记为中间表
        tables_as_both = all_source_tables.intersection(all_target_tables)
        if tables_as_both:
            all_source_tables.difference_update(tables_as_both)
            all_target_tables.difference_update(tables_as_both)
            all_intermediate_tables.update(tables_as_both)
        
        # 确定要显示的表集合
        tables_to_display = set()
        tables_to_display.update(all_source_tables)
        tables_to_display.update(all_target_tables)
        
        if filter_ctes:
            # 只添加物理中间表（包含点号的表名）
            physical_intermediates = {t for t in all_intermediate_tables if '.' in t}
            tables_to_display.update(physical_intermediates)
        else:
            # 添加所有中间表
            tables_to_display.update(all_intermediate_tables)
        
        # 生成节点列表
        nodes_list = []
        current_y = START_Y
        
        # 首先添加源表
        for table_name in sorted(all_source_tables):
            nodes_list.append({
                "name": table_name,
                "type": "Origin",
                "fields": [],  # 表级血缘不显示字段
                "left": START_X,
                "top": current_y
            })
            current_y += NODE_BASE_HEIGHT + NODE_VERTICAL_SPACING
        
        # 然后添加中间表
        intermediates_to_show = set()
        if filter_ctes:
            intermediates_to_show = {t for t in all_intermediate_tables if '.' in t}
        else:
            intermediates_to_show = all_intermediate_tables
            
        current_y = START_Y
        for table_name in sorted(intermediates_to_show):
            nodes_list.append({
                "name": table_name,
                "type": "Middle",
                "fields": [],
                "left": START_X + LAYER_HORIZONTAL_SPACING,
                "top": current_y
            })
            current_y += NODE_BASE_HEIGHT + NODE_VERTICAL_SPACING
        
        # 最后添加目标表
        current_y = START_Y
        for table_name in sorted(all_target_tables):
            nodes_list.append({
                "name": table_name,
                "type": "RS",
                "fields": [],
                "left": START_X + LAYER_HORIZONTAL_SPACING * 2,
                "top": current_y
            })
            current_y += NODE_BASE_HEIGHT + NODE_VERTICAL_SPACING
        
        # 生成边列表
        edges_list = []
        for source, target in sorted(edges_set):
            # 只添加连接到要显示的表的边
            if source in tables_to_display and target in tables_to_display:
                edges_list.append({
                    "from": {"field": "", "name": source},
                    "to": {"field": "", "name": target}
                })
        
        return {
            "nodes": nodes_list,
            "edges": edges_list
        }
        
    except Exception as e:
        print(f"Error in get_table_lineage_json: {str(e)}")
        traceback.print_exc()
        raise 