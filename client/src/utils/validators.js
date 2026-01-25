export const isEmail = (value = "") => /.+@.+\..+/.test(value);
export const isPhone = (value = "") => /^\d{10}$/.test(value);
