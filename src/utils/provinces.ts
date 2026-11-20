/** 34 tỉnh, thành phố sau sắp xếp đơn vị hành chính (01/7/2025) – tọa độ trung tâm gần đúng */
export const PROVINCES: { name: string; lat: number; lng: number; region: "bac" | "trung" | "nam" }[] = [
  { name: "TP Hà Nội", lat: 21.03, lng: 105.85, region: "bac" }, { name: "TP Hải Phòng", lat: 20.86, lng: 106.68, region: "bac" },
  { name: "Quảng Ninh", lat: 21.01, lng: 107.29, region: "bac" }, { name: "Bắc Ninh", lat: 21.19, lng: 106.08, region: "bac" },
  { name: "Hưng Yên", lat: 20.65, lng: 106.05, region: "bac" }, { name: "Ninh Bình", lat: 20.25, lng: 105.97, region: "bac" },
  { name: "Phú Thọ", lat: 21.32, lng: 105.4, region: "bac" }, { name: "Thái Nguyên", lat: 21.59, lng: 105.85, region: "bac" },
  { name: "Tuyên Quang", lat: 21.82, lng: 105.21, region: "bac" }, { name: "Lào Cai", lat: 22.48, lng: 103.97, region: "bac" },
  { name: "Cao Bằng", lat: 22.67, lng: 106.26, region: "bac" }, { name: "Lạng Sơn", lat: 21.85, lng: 106.76, region: "bac" },
  { name: "Lai Châu", lat: 22.39, lng: 103.46, region: "bac" }, { name: "Điện Biên", lat: 21.39, lng: 103.02, region: "bac" },
  { name: "Sơn La", lat: 21.33, lng: 103.91, region: "bac" }, { name: "Thanh Hóa", lat: 19.81, lng: 105.78, region: "trung" },
  { name: "Nghệ An", lat: 18.68, lng: 105.68, region: "trung" }, { name: "Hà Tĩnh", lat: 18.34, lng: 105.91, region: "trung" },
  { name: "Quảng Trị", lat: 16.75, lng: 107.19, region: "trung" }, { name: "TP Huế", lat: 16.46, lng: 107.59, region: "trung" },
  { name: "TP Đà Nẵng", lat: 16.05, lng: 108.2, region: "trung" }, { name: "Quảng Ngãi", lat: 15.12, lng: 108.8, region: "trung" },
  { name: "Gia Lai", lat: 13.98, lng: 108.0, region: "trung" }, { name: "Đắk Lắk", lat: 12.67, lng: 108.04, region: "trung" },
  { name: "Khánh Hòa", lat: 12.24, lng: 109.19, region: "trung" }, { name: "Lâm Đồng", lat: 11.94, lng: 108.44, region: "trung" },
  { name: "TP Hồ Chí Minh", lat: 10.78, lng: 106.7, region: "nam" }, { name: "Đồng Nai", lat: 10.95, lng: 106.82, region: "nam" },
  { name: "Tây Ninh", lat: 11.31, lng: 106.1, region: "nam" }, { name: "TP Cần Thơ", lat: 10.03, lng: 105.78, region: "nam" },
  { name: "Vĩnh Long", lat: 10.25, lng: 105.97, region: "nam" }, { name: "Đồng Tháp", lat: 10.46, lng: 105.63, region: "nam" },
  { name: "An Giang", lat: 10.38, lng: 105.43, region: "nam" }, { name: "Cà Mau", lat: 9.18, lng: 105.15, region: "nam" },
];
export const REGION_LABEL = { bac: "Miền Bắc", trung: "Miền Trung", nam: "Miền Nam" } as const;
export const provinceOf = (name?: string) => PROVINCES.find((p) => p.name === name);
