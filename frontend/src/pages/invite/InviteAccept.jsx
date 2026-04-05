import { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faCheckCircle, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [status, setStatus] = useState("loading"); // loading, verifying, accepting, accepted, error
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState(null);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    // If not authenticated, redirect to login with return URL
    if (isAuthenticated === false) {
      const returnUrl = `/invite/accept?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      navigate(`/signup?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (isAuthenticated === null) {
      // Still loading auth
      return;
    }

    // User is authenticated, verify token
    verifyAndAcceptInvite();
  }, [isAuthenticated, token, email, navigate]);

  const verifyAndAcceptInvite = async () => {
    if (!token || !email) {
      setStatus("error");
      setError("Missing token or email in invite link");
      return;
    }

    try {
      setStatus("verifying");

      // First verify the token
      const verifyResponse = await fetch(
        `/api/invite/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        { credentials: "include" }
      );

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        setStatus("error");
        setError(data.error || "Invalid invite link");
        return;
      }

      const verifyData = await verifyResponse.json();
      setRoomId(verifyData.roomId);

      // Accept the invite
      setStatus("accepting");
      const acceptResponse = await fetch("/api/invite/accept-invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });

      if (!acceptResponse.ok) {
        const data = await acceptResponse.json();
        setStatus("error");
        setError(data.error || "Failed to accept invite");
        return;
      }

      setStatus("accepted");
      // Redirect to room after 2 seconds
      setTimeout(() => {
        navigate(`/${verifyData.roomId}/expenses`);
      }, 2000);
    } catch (err) {
      console.error("Error during invite acceptance:", err);
      setStatus("error");
      setError("Network error. Please try again.");
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 mb-4 animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {status === "loading" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Processing Invite</h2>
            <p className="text-slate-600">Please wait...</p>
          </div>
        )}

        {status === "verifying" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Verifying Invite</h2>
            <p className="text-slate-600">Checking your invite link...</p>
          </div>
        )}

        {status === "accepting" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Accepting Invite</h2>
            <p className="text-slate-600">Adding you to the room...</p>
          </div>
        )}

        {status === "accepted" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-green-600 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Invite Accepted!</h2>
            <p className="text-slate-600">Redirecting to your room...</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-red-600 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Invite Error</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InviteAccept;
