import axios from "axios";

axios.defaults.baseURL = ``
axios.defaults.headers.get['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';


export default axios;