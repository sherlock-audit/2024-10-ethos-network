import { type Message } from '../../types/message';

export async function sendMessage<T>(message: Message): Promise<T> {
  return await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, function (response: T) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
