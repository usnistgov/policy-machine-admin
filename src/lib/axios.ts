import axios, {AxiosInstance} from "axios";
import Cookies from "js-cookie";

export const pdp: AxiosInstance = axios.create({
    baseURL: "http://localhost:8888/",
    withCredentials: true,
});

pdp.interceptors.request.use(
    (config) => {
        // TODO get user from cookies
        config.headers.user = `u1`;
        return config;
    }
)