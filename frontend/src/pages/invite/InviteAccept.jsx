import { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faCheckCircle, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);
  const [status, setStatus] = useState("loading"); // loading, verifying, accepting, accepted, error, wrong-account, already-accepted
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState(null);

  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const inviteRoomId = searchParams.get("roomId");

  useEffect(() => {
    if (isAuthenticated === null) {
      // Still loading auth state - wait
      return;
    }

    if (isAuthenticated === false) {
      // Not authenticated - redirect to signup with invite link
      // skipVerification=true because email is already verified by clicking the invite link
      const redirectUrl = `/invite/accept?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}${inviteRoomId ? `&roomId=${inviteRoomId}` : ''}`;
      const params = new URLSearchParams({
        redirect: redirectUrl,
        skipVerification: "true",
      });
      if (email) {
        params.set("email", email);
      }
      navigate(`/signup?${params.toString()}`);
      return;
    }

    // User is authenticated but has no email (user was deleted from DB) - treat as unauthenticated
    if (isAuthenticated && user && !user.email) {
      const redirectUrl = `/invite/accept?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}${inviteRoomId ? `&roomId=${inviteRoomId}` : ''}`;
      const params = new URLSearchParams({
        redirect: redirectUrl,
        skipVerification: "true",
      });
      if (email) {
        params.set("email", email);
      }
      navigate(`/signup?${params.toString()}`);
      return;
    }

    // User is authenticated - check if their email matches the invite email
    if (user && user.email && email && user.email !== email) {
      // Logged in with wrong account - show message
      setStatus("wrong-account");
      return;
    }

    // User is authenticated and email matches (or email not yet available from user object)
    // Verify token
    verifyAndAcceptInvite();
  }, [isAuthenticated, user, token, email, navigate]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      // Clear auth state - AuthContext doesn't expose logout, so we reload
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
      // Force reload anyway to clear cookies
      window.location.reload();
    }
  };

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
        `/api/invite/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}${inviteRoomId ? `&roomId=${inviteRoomId}` : ''}`,
        { credentials: "include" }
      );

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        const msg = data.error || "Invalid invite link";
        // Handle the "Invite already accepted" case as a special status
        if (msg === "Invite already accepted") {
          setStatus("already-accepted");
        } else {
          setStatus("error");
          setError(msg);
          toast.error(msg);
        }
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
        body: JSON.stringify({ token, email, roomId: inviteRoomId }),
      });

      if (!acceptResponse.ok) {
        const data = await acceptResponse.json();
        setStatus("error");
        const msg = data.error || "Failed to accept invite";
        setError(msg);
        toast.error(msg);
        return;
      }

      setStatus("accepted");
      toast.success("Invite accepted! Redirecting...");
      // Redirect to room after 2 seconds
      setTimeout(() => {
        navigate(`/${verifyData.roomId}/expenses`);
      }, 2000);
    } catch (err) {
      console.error("Error during invite acceptance:", err);
      setStatus("error");
      const msg = "Network error. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen page-shell flex items-center justify-center p-4">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-shell flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-8 border border-border">
        {status === "loading" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Processing Invite</h2>
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        )}

        {status === "wrong-account" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-expense mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Wrong Account</h2>
            <p className="text-muted-foreground mb-2">
              This invite was sent to <strong>{email}</strong>, but you're logged in as <strong>{user?.username}</strong>.
            </p>
            <p className="text-muted-foreground mb-6">
              Please log out and sign in with the correct account to accept this invite.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="btn-primary-expense w-full py-3 text-sm font-semibold cursor-pointer"
              >
                Log Out & Use Correct Account
              </button>
              <button
                onClick={() => navigate("/rooms")}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "verifying" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Verifying Invite</h2>
            <p className="text-muted-foreground">Checking your invite link...</p>
          </div>
        )}

        {status === "accepting" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Accepting Invite</h2>
            <p className="text-muted-foreground">Adding you to the room...</p>
          </div>
        )}

        {status === "accepted" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-income mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Invite Accepted!</h2>
            <p className="text-muted-foreground">Redirecting to your room...</p>
          </div>
        )}

        {status === "already-accepted" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-income mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Invite Already Accepted</h2>
            <p className="text-muted-foreground mb-6">
              You've already accepted this invite and are a member of the room.
            </p>
            <button
              onClick={() => navigate("/rooms")}
              className="btn-primary-expense px-6 py-2 font-medium"
            >
              Go to Rooms
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-expense mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Invite Error</h2>
            <p className="text-expense mb-6">{error}</p>
            <button
              onClick={() => navigate("/rooms")}
              className="btn-primary-expense px-6 py-2 font-medium"
            >
              Back to Rooms
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InviteAccept;
