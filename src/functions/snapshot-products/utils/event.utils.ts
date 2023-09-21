export const parseBody = (event: { body: string | unknown }) => {
  if (typeof event.body !== 'string') {
    return {};
  }
  
  return JSON.parse(event.body);
};
