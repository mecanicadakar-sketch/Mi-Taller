export type OrderStatus = 'ingresado' | 'diagnostico' | 'reparacion' | 'repuestos' | 'listo' | 'entregado';

export type SubscriptionPlan = 'trial' | 'basico' | 'pro' | 'enterprise';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'trial' | 'expired' | 'pending';
  trialEndsAt: string; // ISO string date
  subscriptionEndsAt?: string;
  maxWorkOrders?: number; // e.g., 20 for trial/basic
}

export interface Mechanic {
  id: string;
  tallerId?: string;
  nombre: string;
  especialidad?: string;
  telefono?: string;
  activo: boolean;
}

export interface Workshop {
  id: string; // matches auth.uid
  nombreTaller: string;
  nombreOwner: string;
  email: string;
  telefono: string;
  direccion?: string;
  ciudad?: string;
  logoUrl?: string;
  createdAt: string;
  subscription?: SubscriptionInfo;
}

export interface Vehicle {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  nivelCombustible: '1/4' | '1/2' | '3/4' | 'Lleno' | 'Reserva';
  observacionesVisuales?: string;
}

export interface Client {
  id: string;
  tallerId?: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion?: string;
  vehiculos: Vehicle[];
}

export interface ServiceItem {
  id: string;
  descripcion: string;
  costoManoObra: number;
  repuestosUtilizados: {
    inventoryItemId: string;
    nombreRepuesto: string;
    cantidad: number;
    precioUnitario: number;
  }[];
}

export interface MantenimientoChecklist {
  intervaloKm?: number; // 5000, 7000, 10000, 20000, 50000, 100000
  filtroAceite?: boolean;
  filtroAire?: boolean;
  filtroCombustible?: boolean;
  filtroHabitaculo?: boolean;
  filtroCajaATF?: boolean; // Filtro de caja de cambios automática ATF
  aceiteMotor?: boolean;
  tipoAceiteMotor?: string; // ej. 10W40, 5W30 Sintético
  aceiteCajaAutomatica?: boolean; // ATF / Transmisión
  correaDistribucion?: boolean; // Kit Correa Distribución
  bujias?: boolean;
  pastillasFreno?: boolean;
  proximoKmService?: number; // Ej: 85.000 km
  notasService?: string;
}

export interface WorkOrder {
  id: string;
  tallerId?: string;
  numeroOrden: string; // e.g. OT-1042
  fechaIngreso: string;
  fechaEntregaEstimada?: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  vehiculo: Vehicle;
  fallaReportada: string;
  diagnosticoTecnico?: string;
  estado: OrderStatus;
  servicios: ServiceItem[];
  mecanicoAsignado: string;
  totalEstimado: number;
  mantenimiento?: MantenimientoChecklist;
  notasInternas?: string;
}

export interface InventoryItem {
  id: string;
  tallerId?: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  precioCosto: number;
  precioVenta: number;
  ubicacion: string;
}

export interface Budget {
  id: string;
  tallerId?: string;
  numeroPresupuesto: string;
  fecha: string;
  clienteNombre: string;
  clienteTelefono: string;
  vehiculoInfo: string;
  items: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  descuento: number;
  total: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}
