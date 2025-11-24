//core
import {createApp} from 'vue'
import App from './App.vue'
import router from './router'

// 导入样式
import './styles/main.css'

createApp(App).use(router)
    .mount('#app')
