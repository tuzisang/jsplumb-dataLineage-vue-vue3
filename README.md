# JSPlumb Data Lineage Visualization

A data lineage visualization tool built with Vue.js and Python Flask.

## Quick Start with Docker

### Prerequisites
- Docker
- Docker Compose

### Running the Application

1. Clone the repository:
```bash
git clone <repository-url>
cd jsplumb-dataLineage-vue-vue3
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:5000

### Stopping the Application
```bash
docker-compose down
```

## Development Setup

If you want to develop the application locally, you'll need:

### Frontend
- Node.js
- npm

```bash
npm install
npm run serve
```

### Backend
- Python 3.10+
- pip

```bash
cd api
pip install -r requirements.txt
python server.py
```

# jsplumb-dataLineage-vue3

- vue3 + vite4 
- 由于不熟悉 vue3 和 ts 所以该版本没有左侧按钮提供方法。请参考master分支的vue2版本自行编写。

![图片](https://github.com/mizuhokaga/jsplumb-dataLineage-vue/blob/vue3/src/assets/sample.png)

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run servce
```

浏览器访问 http://localhost:8620
