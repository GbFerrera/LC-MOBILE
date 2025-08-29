# Bottom Sheet Components

## BottomSheetModal

Componente reutilizável baseado no `@gorhom/bottom-sheet` para criar modais que deslizam de baixo para cima.

### Uso Básico

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import BottomSheetModal from '../components/BottomSheetModal';
import { useBottomSheet } from '../hooks/useBottomSheet';

export default function MyScreen() {
  const { bottomSheetRef, openBottomSheet, closeBottomSheet } = useBottomSheet();

  return (
    <View>
      <Button onPress={() => openBottomSheet(1)}>
        Abrir Bottom Sheet
      </Button>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['25%', '50%', '90%']}
        onClose={() => console.log('Fechado')}
      >
        <Text>Conteúdo do Bottom Sheet</Text>
      </BottomSheetModal>
    </View>
  );
}
```

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `children` | `ReactNode` | - | Conteúdo do bottom sheet |
| `snapPoints` | `string[]` | `['25%', '50%', '90%']` | Pontos de parada do sheet |
| `enablePanDownToClose` | `boolean` | `true` | Permite fechar arrastando para baixo |
| `backdropOpacity` | `number` | `0.5` | Opacidade do fundo |
| `onClose` | `() => void` | - | Callback quando fechado |

## useBottomSheet Hook

Hook personalizado para facilitar o controle do Bottom Sheet.

### Métodos Disponíveis

```tsx
const {
  bottomSheetRef,      // Ref para o componente
  openBottomSheet,     // (snapIndex?: number) => void
  closeBottomSheet,    // () => void
  expandBottomSheet,   // () => void
  collapseBottomSheet  // () => void
} = useBottomSheet();
```

## ClientDetailsBottomSheet

Componente específico para mostrar detalhes de um cliente usando o Bottom Sheet.

### Uso

```tsx
import ClientDetailsBottomSheet from '../components/ClientDetailsBottomSheet';

const [selectedClient, setSelectedClient] = useState<Client | null>(null);
const { bottomSheetRef, openBottomSheet, closeBottomSheet } = useBottomSheet();

// Abrir detalhes do cliente
const handleClientPress = (client: Client) => {
  setSelectedClient(client);
  openBottomSheet(1);
};

// Render
<ClientDetailsBottomSheet
  client={selectedClient}
  bottomSheetRef={bottomSheetRef}
  onClose={() => {
    setSelectedClient(null);
    closeBottomSheet();
  }}
  onEdit={(client) => {
    // Navegar para edição
  }}
  onCall={(phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }}
  onWhatsApp={(phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}`);
  }}
/>
```

### Props do ClientDetailsBottomSheet

| Prop | Tipo | Descrição |
|------|------|-----------|
| `client` | `Client \| null` | Dados do cliente |
| `bottomSheetRef` | `React.RefObject<BottomSheetModalRef>` | Ref do bottom sheet |
| `onClose` | `() => void` | Callback ao fechar |
| `onEdit` | `(client: Client) => void` | Callback para editar |
| `onCall` | `(phoneNumber: string) => void` | Callback para ligar |
| `onWhatsApp` | `(phoneNumber: string) => void` | Callback para WhatsApp |

## Exemplo Completo

Veja o arquivo `ClientsScreen.tsx` para um exemplo completo de implementação com lista de clientes e bottom sheet de detalhes.

### Funcionalidades Incluídas

- ✅ Componente base reutilizável
- ✅ Hook para facilitar o uso
- ✅ Componente específico para detalhes de cliente
- ✅ Integração com temas
- ✅ Suporte a gestos (arrastar para fechar)
- ✅ Backdrop customizável
- ✅ Múltiplos snap points
- ✅ Callbacks para ações (ligar, WhatsApp, editar)
- ✅ Formatação automática de dados
- ✅ Responsivo e acessível

### Personalizações

Para criar outros bottom sheets específicos, use o `BottomSheetModal` como base e adicione seu conteúdo personalizado, seguindo o padrão do `ClientDetailsBottomSheet`.
