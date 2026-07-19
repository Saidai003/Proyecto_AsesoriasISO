export function showToast({ title='Notificación', message='', type='info', ttl=5000 } = {}){
    // here, we dispatch a CustomEvent 'toast:show' on the global window object.
    // The Toast component listens for this event and will show a toast with the provided details.
    // toast:show is a custom event name we defined for our app's toast notifications.
    // it says toast, then : and finally show because it is a convention to namespace custom events with a colon, 
    // and this event represents the action of showing a toast.
  window.dispatchEvent(new CustomEvent('toast:show', { detail: { title, message, type, ttl } }))
}
// Convenience function to show a toast without needing to import the whole Toast module
// Usage: showToast({ title: 'Error', message: 'Something went wrong', type: 'error', ttl: 7000 })
// `type` can be used to style the toast differently (e.g. error, success, info)
// `ttl` is time-to-live in milliseconds; if 0 or negative, the toast will be persistent until manually closed

export default { showToast }

// custom events must be explictly called whenever an action occurs?

// Answer: Yes, custom events in JavaScript are not automatically
//  triggered; you need to explicitly dispatch them using
//  `window.dispatchEvent` or a similar method on a specific 
// DOM element. In this code, the `showToast` function is 
// responsible for dispatching a 'toast:show' event with the
//  relevant details (title, message, type, ttl) whenever it is 
// called. The Toast component listens for this event and reacts 
// accordingly to display the toast notification.

