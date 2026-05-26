import axios from 'axios';

const backendBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '';

const backend = axios.create({ baseURL: backendBase });

backend.defaults.headers.get = backend.defaults.headers.get || {};
backend.defaults.headers.post = backend.defaults.headers.post || {};
backend.defaults.headers.get['Accept'] = 'application/json';
backend.defaults.headers.post['Content-Type'] = 'application/json';

// Attach Token auth from localStorage to every backend request
backend.interceptors.request.use((config) => {
	const token = localStorage.getItem('auth_token');
	if (!config.headers) config.headers = {} as any;
	if (token) {
		(config.headers as any).Authorization = `Token ${token}`;
	}
	return config;
});

backend.interceptors.response.use(
	(response) => response,
	(error) => Promise.reject(error)
);

export default backend;