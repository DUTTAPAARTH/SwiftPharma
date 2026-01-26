export const ensureAuthenticated = (navigate) => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    navigate("/login");
    return false;
  }
  return true;
};
