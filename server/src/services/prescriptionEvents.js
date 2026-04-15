import CaregiverLink from "../models/CaregiverLink.js";
import { emitToUser } from "../socket.js";
import { PRESCRIPTION_SOCKET_EVENTS } from "../utils/socketEvents.js";

export const emitPrescriptionUpdate = async ({
  userId,
  prescriptionId = null,
  reason,
  payload = {},
}) => {
  if (!userId || !reason) return;

  const eventPayload = {
    prescriptionId,
    reason,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  emitToUser(String(userId), PRESCRIPTION_SOCKET_EVENTS.UPDATE, eventPayload);

  const caregiverLinks = await CaregiverLink.find({
    patientId: userId,
    status: "active",
    caregiverId: { $ne: null },
  })
    .select("caregiverId")
    .lean();

  for (const link of caregiverLinks) {
    if (!link?.caregiverId) continue;
    emitToUser(
      String(link.caregiverId),
      PRESCRIPTION_SOCKET_EVENTS.UPDATE,
      eventPayload,
    );
  }
};
