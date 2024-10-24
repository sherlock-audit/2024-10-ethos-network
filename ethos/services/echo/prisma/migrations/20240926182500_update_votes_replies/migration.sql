UPDATE public.votes
SET contract = 'profile'
WHERE "targetContract" IN ('0xF570158319a25a1bf0F1e4Dd38bCEC573bd39229', '0x06abcDFDFC12a2Df54BB9AEF6191c30d60d7dA97');

UPDATE public.votes
SET contract = 'review'
WHERE "targetContract" IN ('0xD3cf1Ff9C0a4BBfCfC958E264dFe8486fF1018cc', '0x92FF66D134892A54f887A2E4be14599364963220');

UPDATE public.votes
SET contract = 'attestation'
WHERE "targetContract" IN ('0x83523cE61C93064FB48d2A9b20556b15ab2b11Dc', '0x25BE4c848690c587Bd4A9ad3124Bc03837fBd6c0');

UPDATE public.votes
SET contract = 'vouch'
WHERE "targetContract" IN ('0xf7C8a5e41705fF781Bdd4F49c493bF6B28cc33a8', '0x093eCeb66acD5d61b5098D3Bc0C72541b5519011');

UPDATE public.votes
SET contract = 'discussion'
WHERE "targetContract" IN ('0xA949a3003466b5cdC399481DA8385BD67C8a78B8', '0xc1d75421d22F7228bAf65c6caf952F75e9e043a6');

UPDATE public.replies
SET contract = 'profile'
WHERE "targetContract" IN ('0xF570158319a25a1bf0F1e4Dd38bCEC573bd39229', '0x06abcDFDFC12a2Df54BB9AEF6191c30d60d7dA97');

UPDATE public.replies
SET contract = 'review'
WHERE "targetContract" IN ('0xD3cf1Ff9C0a4BBfCfC958E264dFe8486fF1018cc', '0x92FF66D134892A54f887A2E4be14599364963220');

UPDATE public.replies
SET contract = 'attestation'
WHERE "targetContract" IN ('0x83523cE61C93064FB48d2A9b20556b15ab2b11Dc', '0x25BE4c848690c587Bd4A9ad3124Bc03837fBd6c0');

UPDATE public.replies
SET contract = 'vouch'
WHERE "targetContract" IN ('0xf7C8a5e41705fF781Bdd4F49c493bF6B28cc33a8', '0x093eCeb66acD5d61b5098D3Bc0C72541b5519011');

UPDATE public.replies
SET contract = 'discussion'
WHERE "targetContract" IN ('0xA949a3003466b5cdC399481DA8385BD67C8a78B8', '0xc1d75421d22F7228bAf65c6caf952F75e9e043a6');
