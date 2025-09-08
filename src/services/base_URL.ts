import axios from 'axios';

// Criando a instância do axios
export const baseURL = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
  baseURL: 'https://api.linkcallendar.com', // URL base da API
});