import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, UserPlus, LoaderCircle, Users, ChevronRight } from 'lucide-react'
import { getMyRooms, createRoom } from '../../api/rooms'
import { sendInvite } from '../../api/invite'
import type { Room } from '../../types'

function WelcomePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [roomName, setRoomName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const navigate = useNavigate()

  // Fetch user's rooms on mount
  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const data = await getMyRooms()
      setRooms(data)
    } catch (err) {
      console.error('Error fetching rooms:', err)
      toast.error('Failed to load rooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!roomName.trim()) {
      toast.error('Room name cannot be empty')
      return
    }

    setIsCreating(true)

    try {
      const data = await createRoom(roomName)
      setRooms([...rooms, data.data])
      setRoomName('')
      setShowCreateDialog(false)
      toast.success('Room created successfully!')
    } catch (err) {
      console.error('Error creating room:', err)
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Email cannot be empty')
      return
    }

    setIsInviting(true)

    try {
      await sendInvite({ email: inviteEmail, roomId: selectedRoomId })
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setShowInviteDialog(false)
    } catch (err) {
      console.error('Error sending invite:', err)
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoomClick = (roomId: number) => {
    navigate(`/${roomId}/expenses`)
  }

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
              <Plus size={14} />
              Create Room
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoaderCircle className="text-primary mb-4 animate-spin" size={36} />
            <p className="text-muted-foreground">Loading your rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 state-panel">
            <Users className="text-muted-foreground mb-4" size={48} />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Rooms Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first expense tracking room to get started.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary-expense px-6 py-3 font-medium"
            >
              <Plus size={14} />
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
                    <Users size={14} />
                    <span>{room.member_count} member{Number(room.member_count) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Room Actions */}
                <div className="p-4 flex gap-3">
                  <button
                    onClick={() => handleRoomClick(room.room_id)}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary-expense px-4 py-2 font-medium"
                  >
                    Open
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRoomId(room.room_id)
                      setShowInviteDialog(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary-expense px-4 py-2 font-medium"
                  >
                    <UserPlus size={14} />
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
                    setShowCreateDialog(false)
                    setRoomName('')
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
                  {isCreating && <LoaderCircle className="animate-spin" size={14} />}
                  {isCreating ? 'Creating...' : 'Create'}
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
                    setShowInviteDialog(false)
                    setInviteEmail('')
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
                  {isInviting && <LoaderCircle className="animate-spin" size={14} />}
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default WelcomePage
