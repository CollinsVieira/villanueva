import React, { useState, useEffect } from "react";
import {
  X,
  CheckSquare,
} from "lucide-react";
import { Lote } from "../../types";
import loteService from "../../services/loteService";
import Alert from "../UI/Alert";

interface LoteFormProps {
  lote?: Lote | null;
  onClose: () => void;
  onSave: () => void;
}

// --- TIPO SIMPLIFICADO ---
type LoteFormData = {
  block: string;
  lot_number: string;
  area: string;
  price: string;
};

const LoteForm: React.FC<LoteFormProps> = ({ lote, onClose, onSave }) => {
  const [formData, setFormData] = useState<LoteFormData>({
    block: "",
    lot_number: "",
    area: "0.00",
    price: "0.00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lote) {
      setFormData({
        block: lote.block,
        lot_number: lote.lot_number,
        area: lote.area,
        price: lote.price,
      });
    }
  }, [lote]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const dataToSend = {
        block: formData.block,
        lot_number: formData.lot_number,
        area: formData.area,
        price: formData.price,
      };

      if (lote) {
        await loteService.updateLote(lote.id, dataToSend);
      } else {
        await loteService.createLote(dataToSend);
      }
      
      onSave();
    } catch (err: any) {
      // Manejar errores de validación del backend
      const errorData = err.response?.data;
      let errorMessage = "Ocurrió un error al guardar.";
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(", ");
        } else if (typeof errorData === 'object') {
          // Buscar el primer mensaje de error en los campos
          const firstError = Object.values(errorData).find(val => val);
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold">
                {lote
                  ? `Editar Lote (Mz. ${lote.block} - Lt. ${lote.lot_number})`
                  : "Crear Nuevo Lote"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}

            {/* Formulario principal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manzana
                </label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de Lote
                </label>
                <input
                  type="text"
                  name="lot_number"
                  value={formData.lot_number}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Venta
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center space-x-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckSquare size={16} />
                  <span>{lote ? "Actualizar Lote" : "Crear Lote"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoteForm;
