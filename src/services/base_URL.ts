import axios from 'axios';

// Criando a instância do axios
export const baseURL = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
  baseURL: 'http://localhost:3131', // URL base da API
});