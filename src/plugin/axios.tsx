import axios from "axios";

axios.defaults.baseURL = `${import.meta.env.VITE_URL}api/v1/`
axios.defaults.headers.get['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';


export default axios;