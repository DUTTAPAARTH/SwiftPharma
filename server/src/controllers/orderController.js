import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { matchPrescriptionForOrder } from "./prescriptionController.js";

export const listOrders = async (req, res) => {
  try {
    const filter = req.user?.role === "admin" ? {} : { user: req.user._id };
    const orders = await Order.find(filter)
      .populate("items.product")
      .populate("prescriptionId")
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error("listOrders error", error);
    return res.status(500).json({ message: "Failed to list orders" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { items = [], address, payment, prescriptionId } = req.body;
    if (!items.length) return res.status(400).json({ message: "No items" });
    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const rxProducts = products.filter((p) => p.isRx || p.prescriptionRequired);
    if (rxProducts.length) {
      const check = await matchPrescriptionForOrder(
        prescriptionId,
        req.user._id
      );
      if (!check.ok)
        return res
          .status(400)
          .json({ message: check.reason || "Prescription required" });
    }

    const order = await Order.create({
      user: req.user._id,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
      })),
      status: "Placed",
      address,
      payment,
      prescriptionId: prescriptionId || null,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("createOrder error", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (error) {
    console.error("updateOrderStatus error", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};
