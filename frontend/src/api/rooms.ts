import { request } from './client'
import type { Member, Room } from '../types'

export function getMyRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms/my-rooms')
}

export function createRoom(name: string): Promise<{ data: Room }> {
  return request('/api/rooms/create-room', {
    method: 'POST',
    body: { name },
  })
}

export function getRoomMembers(roomId: string): Promise<Member[]> {
  return request<Member[]>(`/api/rooms/${roomId}/members`)
}
