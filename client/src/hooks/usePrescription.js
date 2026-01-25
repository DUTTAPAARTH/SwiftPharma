import { useContext } from "react";
import { PrescriptionContext } from "../context/PrescriptionContext";

export const usePrescription = () => useContext(PrescriptionContext);
