import { Client, WorkOrder, InventoryItem, Budget, Mechanic } from '../types/tallerya';

export const INITIAL_MECHANICS: Mechanic[] = [
  { id: 'm1', nombre: 'Juan Pérez', especialidad: 'Mecánica General & Service', telefono: '+54 9 11 5555-1111', activo: true }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    nombre: 'Carlos Rodríguez',
    telefono: '+54 9 11 4522-8901',
    email: 'carlos.rodriguez@gmail.com',
    direccion: 'Av. Corrientes 3420, CABA',
    vehiculos: [
      {
        id: 'v1',
        patente: 'AE 452 XY',
        marca: 'Toyota',
        modelo: 'Hilux SRV 2.8',
        anio: 2021,
        kilometraje: 78500,
        nivelCombustible: '1/2',
        observacionesVisuales: 'Pequeño rayón en paragolpes trasero derecho.'
      }
    ]
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv1',
    codigo: 'ACE-5W30-4L',
    nombre: 'Aceite Sintético Motul 8100 5W30 (4L)',
    categoria: 'Lubricantes',
    stockActual: 18,
    stockMinimo: 5,
    precioCosto: 32000,
    precioVenta: 48000,
    ubicacion: 'Estantería A-1'
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1',
    numeroOrden: 'OT-1041',
    fechaIngreso: '2026-08-03T09:30:00',
    fechaEntregaEstimada: '2026-08-05T17:00:00',
    clienteId: 'c1',
    clienteNombre: 'Carlos Rodríguez',
    clienteTelefono: '+54 9 11 4522-8901',
    vehiculo: {
      id: 'v1',
      patente: 'AE 452 XY',
      marca: 'Toyota',
      modelo: 'Hilux SRV 2.8',
      anio: 2021,
      kilometraje: 78500,
      nivelCombustible: '1/2',
      observacionesVisuales: 'Rayón en paragolpes trasero.'
    },
    fallaReportada: 'Service programado de 80.000 km y ruidero leve al frenar.',
    diagnosticoTecnico: 'Requiere cambio de aceite, filtros y desgaste moderado de pastillas delanteras.',
    estado: 'reparacion',
    mecanicoAsignado: 'Mecanico Juan Pérez',
    totalEstimado: 125000,
    servicios: [
      {
        id: 's1',
        descripcion: 'Service completo de motor y fluidos',
        costoManoObra: 45000,
        repuestosUtilizados: [
          { inventoryItemId: 'inv1', nombreRepuesto: 'Aceite Sintético Motul 5W30', cantidad: 2, precioUnitario: 48000 }
        ]
      }
    ]
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'b1',
    numeroPresupuesto: 'PRES-2026-089',
    fecha: '2026-08-04',
    clienteNombre: 'Carlos Rodríguez',
    clienteTelefono: '+54 9 11 4522-8901',
    vehiculoInfo: 'Toyota Hilux 2.8 (AE 452 XY)',
    items: [
      { descripcion: 'Service completo de motor (Aceite + Filtros)', cantidad: 1, precioUnitario: 95000, subtotal: 95000 },
      { descripcion: 'Limpieza e inspección de frenos traseros', cantidad: 1, precioUnitario: 30000, subtotal: 30000 }
    ],
    descuento: 5000,
    total: 120000,
    estado: 'aprobado'
  }
];
