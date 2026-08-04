import { Client, WorkOrder, InventoryItem, Budget, Mechanic } from '../types/tallerya';

export const INITIAL_MECHANICS: Mechanic[] = [
  { id: 'm1', nombre: 'Juan Pérez', especialidad: 'Mecánica General & Service', telefono: '+54 9 11 5555-1111', activo: true },
  { id: 'm2', nombre: 'Pedro Gómez', especialidad: 'Frenos & Tren Delantero', telefono: '+54 9 11 5555-2222', activo: true },
  { id: 'm3', nombre: 'Ing. Marcelo R.', especialidad: 'Inyección & Diagnóstico Electrónico', telefono: '+54 9 11 5555-3333', activo: true },
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
  },
  {
    id: 'c2',
    nombre: 'Mariana Gómez',
    telefono: '+54 9 11 6789-1234',
    email: 'mgomez@outlook.com',
    direccion: 'Belgrano 145, San Isidro',
    vehiculos: [
      {
        id: 'v2',
        patente: 'AD 109 ZZ',
        marca: 'Volkswagen',
        modelo: 'Gol Trend 1.6',
        anio: 2019,
        kilometraje: 54000,
        nivelCombustible: '3/4',
        observacionesVisuales: 'Taza izquierda delantera faltante.'
      }
    ]
  },
  {
    id: 'c3',
    nombre: 'Esteban Martínez',
    telefono: '+54 9 11 3122-0099',
    email: 'esteban.m@empresa.com',
    direccion: 'Calle 12 N° 450, La Plata',
    vehiculos: [
      {
        id: 'v3',
        patente: 'AF 882 AA',
        marca: 'Ford',
        modelo: 'Ranger XLT 3.2 4x4',
        anio: 2022,
        kilometraje: 32000,
        nivelCombustible: 'Lleno',
        observacionesVisuales: 'Sin detalles visuales.'
      }
    ]
  },
  {
    id: 'c4',
    nombre: 'Lucía Fernández',
    telefono: '+54 9 11 5544-3322',
    email: 'lucia.f@hotmail.com',
    vehiculos: [
      {
        id: 'v4',
        patente: 'AC 931 PO',
        marca: 'Chevrolet',
        modelo: 'Onix Joy 1.4',
        anio: 2018,
        kilometraje: 89000,
        nivelCombustible: '1/4',
        observacionesVisuales: 'Abolladura leve en puerta del copiloto.'
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
  },
  {
    id: 'inv2',
    codigo: 'FIL-ACE-TOY',
    nombre: 'Filtro de Aceite Toyota Hilux Original',
    categoria: 'Filtros',
    stockActual: 12,
    stockMinimo: 4,
    precioCosto: 7500,
    precioVenta: 12500,
    ubicacion: 'Estantería B-2'
  },
  {
    id: 'inv3',
    codigo: 'PAS-FRE-VW',
    nombre: 'Pastillas de Freno Delanteras VW Gol/Fox (Cobreq)',
    categoria: 'Frenos',
    stockActual: 3,
    stockMinimo: 5, // Alerta
    precioCosto: 18000,
    precioVenta: 29000,
    ubicacion: 'Estantería C-4'
  },
  {
    id: 'inv4',
    codigo: 'BUJ-NGK-IR',
    nombre: 'Juego de Bujías NGK Iridium (x4)',
    categoria: 'Encendido',
    stockActual: 8,
    stockMinimo: 3,
    precioCosto: 22000,
    precioVenta: 35000,
    ubicacion: 'Estantería B-1'
  },
  {
    id: 'inv5',
    codigo: 'KIT-CORR-FORD',
    nombre: 'Kit Distribución Ford Ranger 2.2 / 3.2',
    categoria: 'Motor',
    stockActual: 2,
    stockMinimo: 2,
    precioCosto: 85000,
    precioVenta: 130000,
    ubicacion: 'Estantería D-3'
  },
  {
    id: 'inv6',
    codigo: 'LIQ-FRE-DOT4',
    nombre: 'Líquido de Frenos Bosch DOT4 (500ml)',
    categoria: 'Fluidos',
    stockActual: 25,
    stockMinimo: 8,
    precioCosto: 4500,
    precioVenta: 7800,
    ubicacion: 'Estantería A-3'
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
          { inventoryItemId: 'inv1', nombreRepuesto: 'Aceite Sintético Motul 5W30', cantidad: 2, precioUnitario: 48000 },
          { inventoryItemId: 'inv2', nombreRepuesto: 'Filtro de Aceite Toyota', cantidad: 1, precioUnitario: 12500 }
        ]
      }
    ]
  },
  {
    id: 'wo-2',
    numeroOrden: 'OT-1042',
    fechaIngreso: '2026-08-04T08:15:00',
    fechaEntregaEstimada: '2026-08-04T18:00:00',
    clienteId: 'c2',
    clienteNombre: 'Mariana Gómez',
    clienteTelefono: '+54 9 11 6789-1234',
    vehiculo: {
      id: 'v2',
      patente: 'AD 109 ZZ',
      marca: 'Volkswagen',
      modelo: 'Gol Trend 1.6',
      anio: 2019,
      kilometraje: 54000,
      nivelCombustible: '3/4'
    },
    fallaReportada: 'Chirrido agudo al accionar el pedal de freno.',
    diagnosticoTecnico: 'Pastillas cristalizadas y desgastadas por completo.',
    estado: 'repuestos',
    mecanicoAsignado: 'Mecanico Pedro Gómez',
    totalEstimado: 64000,
    servicios: [
      {
        id: 's2',
        descripcion: 'Reemplazo de pastillas de freno delanteras y rectificado',
        costoManoObra: 35000,
        repuestosUtilizados: [
          { inventoryItemId: 'inv3', nombreRepuesto: 'Pastillas de Freno VW Gol', cantidad: 1, precioUnitario: 29000 }
        ]
      }
    ]
  },
  {
    id: 'wo-3',
    numeroOrden: 'OT-1043',
    fechaIngreso: '2026-08-04T10:00:00',
    fechaEntregaEstimada: '2026-08-06T12:00:00',
    clienteId: 'c3',
    clienteNombre: 'Esteban Martínez',
    clienteTelefono: '+54 9 11 3122-0099',
    vehiculo: {
      id: 'v3',
      patente: 'AF 882 AA',
      marca: 'Ford',
      modelo: 'Ranger XLT 3.2 4x4',
      anio: 2022,
      kilometraje: 32000,
      nivelCombustible: 'Lleno'
    },
    fallaReportada: 'Luz de Check Engine encendida en el tablero. Falta de potencia.',
    diagnosticoTecnico: 'Escaneo computarizado revela código P0299 (Bajo soplado de turbo/sensor MAP).',
    estado: 'diagnostico',
    mecanicoAsignado: 'Ing. Marcelo R.',
    totalEstimado: 85000,
    servicios: []
  },
  {
    id: 'wo-4',
    numeroOrden: 'OT-1040',
    fechaIngreso: '2026-08-02T14:00:00',
    fechaEntregaEstimada: '2026-08-03T16:00:00',
    clienteId: 'c4',
    clienteNombre: 'Lucía Fernández',
    clienteTelefono: '+54 9 11 5544-3322',
    vehiculo: {
      id: 'v4',
      patente: 'AC 931 PO',
      marca: 'Chevrolet',
      modelo: 'Onix Joy 1.4',
      anio: 2018,
      kilometraje: 89000,
      nivelCombustible: '1/4'
    },
    fallaReportada: 'Cambio de bujías y cables. Alineación y balanceo.',
    diagnosticoTecnico: 'Finalizado. Motor sereno y tren delantero verificado.',
    estado: 'listo',
    mecanicoAsignado: 'Mecanico Juan Pérez',
    totalEstimado: 72000,
    servicios: [
      {
        id: 's4',
        descripcion: 'Afinación de encendido + Alineación 3D',
        costoManoObra: 37000,
        repuestosUtilizados: [
          { inventoryItemId: 'inv4', nombreRepuesto: 'Juego Bujías NGK', cantidad: 1, precioUnitario: 35000 }
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
  },
  {
    id: 'b2',
    numeroPresupuesto: 'PRES-2026-090',
    fecha: '2026-08-04',
    clienteNombre: 'Roberto Rossi',
    clienteTelefono: '+54 9 11 2233-4455',
    vehiculoInfo: 'Peugeot 208 1.6 (AA 500 QW)',
    items: [
      { descripcion: 'Cambio Kit Distribución + Bomba de agua', cantidad: 1, precioUnitario: 180000, subtotal: 180000 },
      { descripcion: 'Mano de obra especialista', cantidad: 1, precioUnitario: 75000, subtotal: 75000 }
    ],
    descuento: 0,
    total: 255000,
    estado: 'pendiente'
  }
];
