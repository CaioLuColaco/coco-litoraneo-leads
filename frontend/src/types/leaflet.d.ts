declare module 'leaflet' {
  export class Icon {
    static Default: {
      prototype: any;
      mergeOptions(options: any): void;
    };
  }
}

declare module 'react-leaflet' {
  import { ComponentType } from 'react';
  
  export const MapContainer: ComponentType<any>;
  export const TileLayer: ComponentType<any>;
  export const Popup: ComponentType<any>;
  export const CircleMarker: ComponentType<any>;
}


