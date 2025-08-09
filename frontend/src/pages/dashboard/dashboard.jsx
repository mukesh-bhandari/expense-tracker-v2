import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUsers, 
  faTimes, 
  faPlus, 
  faTrash, 
  faEnvelope, 
  faUserPlus, 
  faHome,
  faStar,
  faArrowRight,
  faPaperPlane,
  faCheck
} from "@fortawesome/free-solid-svg-icons";

function WelcomePage() {
  const [showRoomDialog, setShowRoomDialog] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1: Create Room, 2: Invite Members
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [inviteEmails, setInviteEmails] = useState([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Add new email input field
  const addEmailField = () => {
    setInviteEmails([...inviteEmails, ""]);
  };

  // Remove email input field
  const removeEmailField = (index) => {
    if (inviteEmails.length > 1) {
      const newEmails = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(newEmails);
    }
  };

  // Update email value
  const updateEmail = (index, value) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
  };

  // Step 1: Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: roomName, 
          description: roomDescription 
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setCurrentStep(2);
        setSuccess("Room created successfully! Now invite your team members.");
      } else {
        setError(data.message || "Failed to create room. Please try again.");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Send Invitations
  const handleSendInvitations = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Filter out empty emails and validate Gmail addresses
    const validEmails = inviteEmails.filter(email => {
      return email.trim() && email.includes("@gmail.com");
    });

    if (validEmails.length === 0) {
      setError("Please enter at least one valid Gmail address.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/rooms/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Invitations sent to ${validEmails.length} people successfully!`);
        setTimeout(() => {
          setShowRoomDialog(false);
          navigate("/dashboard");
        }, 2000);
      } else {
        setError(data.message || "Failed to send invitations. Please try again.");
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Skip room creation
  const handleSkip = () => {
    setShowRoomDialog(false);
    navigate("/dashboard");
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
                  <FontAwesomeIcon icon={faHome} className="text-primary-foreground text-lg" />
                </div>
                <span className="text-xl font-bold text-foreground">ExpenseTracker</span>
              </div>
              
              <button
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                Skip Setup
              </button>
            </div>
          </div>
        </nav>

        {/* Welcome Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <FontAwesomeIcon icon={faStar} className="text-primary text-3xl" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Welcome to ExpenseTracker!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You're all set! Create your first expense tracking room to start collaborating with your team, family, or friends.
            </p>
          </div>
        </div>
      </div>

      {/* Room Creation Dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="expense-form max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon 
                    icon={currentStep === 1 ? faUsers : faUserPlus} 
                    className="text-primary" 
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {currentStep === 1 ? "Create Your Room" : "Invite Team Members"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentStep === 1 ? "Step 1 of 2" : "Step 2 of 2"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomDialog(false)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6">
              {/* Success Message */}
              {success && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm mb-6 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} className="text-green-600" />
                  {success}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-expense-light border border-expense text-expense text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Step 1: Create Room */}
              {currentStep === 1 && (
                <form onSubmit={handleCreateRoom} className="space-y-6">
                  <div>
                    <label htmlFor="roomName" className="block text-sm font-medium text-muted-foreground mb-2">
                      Room Name *
                    </label>
                    <input
                      id="roomName"
                      type="text"
                      placeholder="e.g., Family Expenses, Team Budget, Trip to Paris"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      required
                      className="input-financial w-full px-4 py-3 text-sm font-medium"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="roomDescription" className="block text-sm font-medium text-muted-foreground mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="roomDescription"
                      placeholder="Brief description of what this room is for..."
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      className="input-financial w-full px-4 py-3 text-sm font-medium resize-none"
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isLoading || !roomName.trim()}
                      className="btn-primary-expense flex-1 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating Room...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <FontAwesomeIcon icon={faUsers} />
                          Create Room
                          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors duration-200"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Invite Members */}
              {currentStep === 2 && (
                <form onSubmit={handleSendInvitations} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-3">
                      Invite People (Gmail addresses)
                    </label>
                    
                    <div className="space-y-3">
                      {inviteEmails.map((email, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FontAwesomeIcon icon={faEnvelope} className="text-muted-foreground text-sm" />
                            </div>
                            <input
                              type="email"
                              placeholder="colleague@gmail.com"
                              value={email}
                              onChange={(e) => updateEmail(index, e.target.value)}
                              className="input-financial w-full pl-10 pr-4 py-3 text-sm font-medium"
                              disabled={isLoading}
                            />
                          </div>
                          {inviteEmails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEmailField(index)}
                              className="px-3 py-3 text-muted-foreground hover:text-expense border border-border rounded-lg transition-colors duration-200"
                              disabled={isLoading}
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-sm" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addEmailField}
                      className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      Add another person
                    </button>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Invited members will receive an email with instructions to join your expense tracking room.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary-expense flex-1 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending Invitations...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <FontAwesomeIcon icon={faPaperPlane} />
                          Send Invitations
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors duration-200"
                    >
                      Skip invites
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WelcomePage;