export const parseBody = (event: { body?: string }) => {
  if (typeof event.body !== 'string') {
    return {};
  }
  
  return JSON.parse(event.body);
};
