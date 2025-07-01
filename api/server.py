from flask import Flask, request, jsonify
from flask_cors import CORS
from lineage import analyze_sql_lineage

app = Flask(__name__)
CORS(app)

@app.route('/api/lineage', methods=['POST'])
def handle_lineage():
    try:
        data = request.get_json()
        if not data or 'sql_query' not in data:
            return jsonify({'error': 'Missing SQL query'}), 400
            
        result, status_code = analyze_sql_lineage(data)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000) 