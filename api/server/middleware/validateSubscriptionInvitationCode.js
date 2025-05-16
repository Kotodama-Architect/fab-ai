async function validateSubscriptionInvitationCode(req, res, next) {
  const { invitationCode } = req.body;
  const requiredInvitationCode = process.env.SUBSCRIPTION_INVITATION_CODE;

  if (!requiredInvitationCode) {
    // 環境変数が設定されていない場合は、このチェックをスキップ
    return next();
  }

  if (!invitationCode) {
    return res.status(400).json({ message: 'Invitation code is required.' });
  }

  if (invitationCode !== requiredInvitationCode) {
    return res.status(400).json({ message: 'Invalid invitation code.' });
  }

  next();
}

module.exports = validateSubscriptionInvitationCode;
