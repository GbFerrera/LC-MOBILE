import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Criando a instância do axios
export const baseURL = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
  baseURL: 'https://api.linkcallendar.com', // URL base da API
});

// Adicionando interceptor para incluir o token e company_id em todas as requisições
baseURL.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    const companyId = await AsyncStorage.getItem('companyId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (companyId) {
      config.headers.company_id = companyId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);