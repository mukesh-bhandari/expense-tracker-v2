import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUserPlus, faSpinner, faUsers, faChevronRight } from "@fortawesome/free-solid-svg-icons";

function WelcomePage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const navigate = useNavigate();

  // Fetch user's rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/rooms/my-rooms", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched rooms:", data);
        setRooms(data);
      } else {
        setError("Failed to load rooms. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Room name cannot be empty");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/create-room", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName }),
      });

      if (response.ok) {
        const data = await response.json();
        setRooms([...rooms, data.data]);
        setRoomName("");
        setShowCreateDialog(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create room.");
      }
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError("Email cannot be empty");
      return;
    }

    setIsInviting(true);
    setError("");
    setInviteSuccess("");

    try {
      const response = await fetch("/api/invite/send-invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          roomId: selectedRoomId,
        }),
      });

      if (response.ok) {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        setTimeout(() => {
          setShowInviteDialog(false);
          setInviteSuccess("");
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send invite.");
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/${roomId}/expenses`);
  };

  return (
    <div className="min-h-screen page-shell">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">ExpenseTracker</h1>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary-expense px-4 py-2 text-sm font-semibold"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Room
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-expense/20 bg-expense-light text-expense">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading your rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 state-panel">
            <FontAwesomeIcon icon={faUsers} className="text-5xl text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Rooms Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first expense tracking room to get started.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary-expense px-6 py-3 font-medium"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Your First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.room_id}
                className="state-panel overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Room Header */}
                <div className="bg-primary p-6 text-primary-foreground">
                  <h3 className="text-xl font-semibold mb-1">{room.room_name}</h3>
                  <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
                    <FontAwesomeIcon icon={faUsers} />
                    <span>{room.member_count} member{room.member_count !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Room Actions */}
                <div className="p-4 flex gap-3">
                  <button
                    onClick={() => handleRoomClick(room.room_id)}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary-expense px-4 py-2 font-medium"
                  >
                    Open
                    <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRoomId(room.room_id);
                      setShowInviteDialog(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary-expense px-4 py-2 font-medium"
                  >
                    <FontAwesomeIcon icon={faUserPlus} />
                    Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6 border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom}>
              <input
                type="text"
                placeholder="Room name (e.g., Team Project, Family Expenses)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="input-financial w-full px-4 py-3 mb-4"
                disabled={isCreating}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setRoomName("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 btn-secondary-expense font-medium"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 btn-primary-expense font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isCreating}
                >
                  {isCreating && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6 border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Invite Member</h2>
            <p className="text-muted-foreground mb-4">Send an invitation to join this room</p>
            
            {inviteSuccess && (
              <div className="mb-4 p-3 bg-income-light border border-income/20 rounded-lg text-income text-sm">
                ✓ {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input-financial w-full px-4 py-3 mb-4"
                disabled={isInviting}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteEmail("");
                    setInviteSuccess("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 btn-secondary-expense font-medium"
                  disabled={isInviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 btn-primary-expense font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isInviting}
                >
                  {isInviting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  {isInviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WelcomePage;