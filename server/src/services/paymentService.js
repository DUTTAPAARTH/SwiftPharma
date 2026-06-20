export const createRazorpayOrder = async (amount) => {
  return { id: "rzp_mock_id", amount, currency: "INR", status: "created" };
};

