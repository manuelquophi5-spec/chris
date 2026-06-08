import { toast, type ToastOptions } from "react-toastify";

const base: ToastOptions = {
  position: "top-right",
  autoClose: 4500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export function toastSuccess(message: string, options?: ToastOptions) {
  toast.success(message, { ...base, ...options });
}

export function toastError(message: string, options?: ToastOptions) {
  toast.error(message, { ...base, autoClose: 6000, ...options });
}

export function toastWarning(message: string, options?: ToastOptions) {
  toast.warning(message, { ...base, ...options });
}

export function toastInfo(message: string, options?: ToastOptions) {
  toast.info(message, { ...base, ...options });
}
