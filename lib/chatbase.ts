/**
 * Identify a user to Chatbase with secure server-side hash generation
 * @param userId - Unique user identifier
 * @param userMetadata - Optional metadata about the user (max 1000 chars)
 */
export async function identifyUserToChatbase(
  userId: string,
  userMetadata?: Record<string, any>
) {
  try {
    // Generate hash on server
    const response = await fetch('/api/chatbase/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userMetadata })
    })

    if (!response.ok) {
      throw new Error('Failed to generate Chatbase hash')
    }

    const data = await response.json()

    // Identify user to Chatbase widget
    if (typeof window !== 'undefined' && window.chatbase) {
      window.chatbase('identify', {
        user_id: data.userId,
        user_hash: data.userHash,
        user_metadata: data.userMetadata
      })

      console.log('User identified to Chatbase:', userId)
      return true
    } else {
      console.warn('Chatbase widget not loaded yet')
      return false
    }
  } catch (error) {
    console.error('Error identifying user to Chatbase:', error)
    return false
  }
}

/**
 * Clear the current user identity from Chatbase
 */
export function clearChatbaseIdentity() {
  if (typeof window !== 'undefined' && window.chatbase) {
    window.chatbase('reset')
    console.log('Chatbase identity cleared')
  }
}
