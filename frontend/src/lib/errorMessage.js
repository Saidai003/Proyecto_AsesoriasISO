export function getErrorText(err, fallback){
  if(!err) return fallback || 'Error'
  if(typeof err === 'string') return err
  // prefer a human message if backend provides it
  if(err.message) return err.message
  if(err.error) return err.error
  return fallback || JSON.stringify(err)
}

export default getErrorText
