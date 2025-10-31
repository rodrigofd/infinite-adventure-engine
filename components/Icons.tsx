
import React from 'react';

export const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const BackpackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 01-9-9V8a3 3 0 013-3h12a3 3 0 013 3v4a9 9 0 01-9 9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5V2m0 3a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
);

export const CompassIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v2m0 14v2m9-9h-2m-14 0H3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12l3.5-3.5M12 12l-3.5 3.5" />
    </svg>
);

export const WandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" className={className}>
        <path fill="currentColor" d="M 1108.83 0 L 1124.44 0 C 1138.66 10.6699 1153.02 26.4372 1165.89 39.1594 L 1232.24 104.981 L 1402.4 273.272 C 1416.12 286.838 1429.34 301.27 1443.29 314.714 C 1450.4 321.573 1456.75 329.306 1464.52 335.522 C 1504.07 317.843 1539.24 299.971 1577.98 281.391 L 1763.69 192.761 L 1835.47 157.996 C 1850.14 150.832 1864.04 143.803 1879.43 137.338 C 1895.75 130.482 1908.81 133.33 1917.49 150.298 C 1922.47 160.026 1915.15 174.783 1910.93 184.34 L 1777.8 483.345 C 1760.13 523.256 1740.93 561.833 1724.65 602.587 L 1878.55 756.301 C 1904.55 782.753 1929.97 810.639 1956.61 836.632 C 1975.96 855.506 1995.6 873.549 2014.32 893.176 C 2026.67 906.131 2039.24 913.688 2048 930.036 L 2048 943.201 C 2043.27 953.672 2041.94 957.059 2032.85 963.834 C 2011.85 966.355 1982.25 961.823 1960.99 960.698 C 1920.76 958.569 1880.66 955.344 1840.51 952.042 L 1559.08 931.216 C 1550.63 946.648 1540.24 973.904 1532.73 990.973 L 1431.81 1221.59 C 1415.57 1260.39 1398.76 1298.96 1381.39 1337.27 C 1375.93 1349.26 1368.16 1372.07 1358.33 1380.7 C 1352.83 1385.53 1342.3 1384.54 1335.21 1383.27 C 1319.95 1371.44 1316.69 1348.65 1311.3 1330.43 L 1290.1 1259.61 C 1276.69 1216.36 1263.6 1173.02 1250.86 1129.57 C 1244.02 1107.11 1236.31 1083.99 1230.02 1061.47 L 1193.68 934.143 C 1189.04 918.42 1184.61 902.362 1180.03 886.618 C 1178.87 883.499 1178.91 882.041 1175.71 880.573 C 1162.22 874.381 1146.98 870.333 1132.79 866.014 L 1072.13 847.284 L 814.477 765.745 L 733.108 740.482 C 717.169 735.474 701.19 730.946 685.755 724.141 C 674.849 719.333 665.317 708.528 673.862 696.747 C 677.686 691.475 685.398 686.146 691.416 683.232 C 711.998 673.266 733.046 664.248 753.713 654.413 L 955.794 559.416 L 1048.54 515.182 C 1061.89 508.66 1096.92 490.753 1109.44 486.687 C 1110.85 465.886 1106.65 419.024 1106.01 395.473 C 1103.52 302.297 1099.11 208.881 1096.06 115.667 C 1095.26 95.7007 1094.32 75.7402 1093.24 55.7872 C 1092.7 43.9755 1091.62 31.0949 1093.11 19.4288 C 1094.29 10.1931 1101.89 5.31255 1108.83 0 z"/>
        <path fill="currentColor" d="M 981.22 889.193 C 1000.37 894.405 1027.34 903.567 1046.39 909.681 C 1061.42 914.506 1108.72 927.513 1119.08 933.717 C 1124.84 944.376 1128.67 958.981 1132.25 970.842 L 1148.59 1025.55 C 1152.09 1037.38 1155.87 1051.55 1160.37 1062.71 C 1153.99 1075.08 1118.94 1108.52 1107.37 1120.11 L 1000.08 1225.99 L 745.515 1479.88 L 357.99 1868.24 L 248.758 1978.08 C 224.944 2001.78 204.029 2029.37 171.405 2040.41 C 164.418 2042.78 150.193 2045.28 144.593 2048 L 111.431 2048 C 104.498 2044.92 89.316 2042.53 80.2349 2039.05 C 46.7697 2026.51 22.2324 1998.55 8.80994 1966 C 5.0618 1956.91 4.30957 1943.41 0 1935.05 L 0 1906.21 C 3.37136 1900.12 4.46897 1890.61 6.38789 1883.76 C 16.5196 1847.59 44.3421 1825.83 69.8709 1800.52 L 145.861 1725.07 L 361.538 1510.06 L 781.705 1089.14 L 931.473 937.786 C 943.235 925.969 969.166 895.797 981.22 889.193 z"/>
    </svg>
);


export const GlobeAltIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

export const ChevronDoubleRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
    </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a2.25 2.25 0 01-1.465-1.465L12 18.75l1.938-.648a2.25 2.25 0 011.465-1.465L17.25 15l.648 1.938a2.25 2.25 0 011.465 1.465L21.75 19.5l-1.938.648a2.25 2.25 0 01-1.465 1.465z" />
    </svg>
);

export const ViewColumnsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
    </svg>
);

export const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
);

export const SpeakerOnIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

export const SpeakerOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

export const PaintBrushIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

export const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

export const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

export const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />
    </svg>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);
