// Coordina que solo un dropdown/panel de la navbar (proyectos, cuenta, etc.) esté abierto a la vez.
let cerrarDropdownActivo = null;

export const registrarAperturaDropdown = (cerrar) => {
  if (cerrarDropdownActivo && cerrarDropdownActivo !== cerrar) {
    cerrarDropdownActivo();
  }
  cerrarDropdownActivo = cerrar;
};

export const registrarCierreDropdown = (cerrar) => {
  if (cerrarDropdownActivo === cerrar) {
    cerrarDropdownActivo = null;
  }
};
