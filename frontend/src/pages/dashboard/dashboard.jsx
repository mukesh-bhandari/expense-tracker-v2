import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faStar } from "@fortawesome/free-solid-svg-icons";

function WelcomePage() {
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/room/create-room", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName,
        }),
      });

      if (response.ok) {
        setSuccess("Room created successfully! Now invite your team members.");
      } else {
        setError(data.message || "Failed to create room. Please try again.");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      navigate("/epxenses");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Content */}
      <div className="relative">
        {/* Header */}
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faHome}
                    className="text-primary-foreground text-lg"
                  />
                </div>
                <span className="text-xl font-bold text-foreground">
                  ExpenseTracker
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Welcome Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <FontAwesomeIcon
                icon={faStar}
                className="text-primary text-3xl"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Welcome to ExpenseTracker!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You're all set! Create your first expense tracking room to start
              collaborating with your team, family, or friends.
            </p>
          </div>
        </div>
        <div>
          <button onClick={setShowRoomDialog(true)}>create room</button>
        </div>
      </div>

      {/* Room Creation Dialog */}
      {showRoomDialog && (
        <div className="p-4">
          <input
            type="text"
            placeholder="Enter room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="border p-2 rounded"
          />
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded ml-2"
          >
            {isLoading ? "Creating..." : "Create Room"}
          </button>
        </div>
      )}
    </div>
  );
}

export default WelcomePage;
