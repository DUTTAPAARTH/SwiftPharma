import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import * as caregiverService from "../../services/caregiverService.js";

const AcceptInvitePage = () => {
  const { token } = useContext(AuthContext);
  const { token: inviteToken } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState("loading"); // loading, success, error
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await caregiverService.acceptInvite(inviteToken);
        setPatientName(data?.patientName || "Patient");
        setState("success");
      } catch (error) {
        setState("error");
      }
    };
    load();
  }, [inviteToken]);

  const handleNext = () => {
    if (token) {
      navigate("/caregiver/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[40px] p-12 text-center">
        {state === "loading" && (
          <>
            <div className="animate-spin inline-block">
              <svg
                className="size-12 text-primary"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Verifying invite...
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Success!
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              You are now linked as a caregiver for{" "}
              <strong>{patientName}</strong>
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              You will receive alerts if they miss a critical medicine dose.
            </p>
            <button
              onClick={handleNext}
              className="mt-8 w-full px-6 py-3 rounded-2xl bg-primary text-white font-black hover:bg-primary-dark transition-colors"
            >
              {token ? "View Dashboard" : "Create Account"}
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <div className="text-6xl mb-4">✕</div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Invalid Link
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              This invite link is invalid or has already been used.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-8 w-full px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-black hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
