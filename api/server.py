from http.server import HTTPServer
from lineage import handler
import sys
import traceback

def run(server_class=HTTPServer, handler_class=handler, port=3000):
    try:
        server_address = ('', port)
        httpd = server_class(server_address, handler_class)
        print(f'Starting server on port {port}...')
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
        httpd.server_close()
    except Exception as e:
        print(f'Error starting server: {e}', file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    try:
        run()
    except ImportError as e:
        print(f'Error: Required package not found: {e}', file=sys.stderr)
        print('Please install required packages using: pip install -r requirements.txt')
        sys.exit(1)
    except Exception as e:
        print(f'Unexpected error: {e}', file=sys.stderr)
        traceback.print_exc()
        sys.exit(1) 