def handler(request):
    """
    简单的测试端点，用于检查API是否正常运行
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': '{"status": "ok", "message": "API is running"}'
    } 