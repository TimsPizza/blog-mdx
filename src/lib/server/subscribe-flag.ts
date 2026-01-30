let subscribeEnabled = false;

export const isSubscribeEnabled = () => subscribeEnabled;

export const setSubscribeEnabled = (next: boolean) => {
  subscribeEnabled = next;
  return subscribeEnabled;
};
