import React from "react";
import AuthForm from "../components/forms/AuthForm";

const Auth = ({ mode = "login" }) => (
  <div className="min-h-screen">
    <AuthForm mode={mode} />
  </div>
);

export default Auth;
