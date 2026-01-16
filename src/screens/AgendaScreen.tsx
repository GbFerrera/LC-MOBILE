import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal } from 'react-native';

import {
  CalendarContainer,
  CalendarHeader,
  CalendarBody,
} from '@howljs/calendar-kit';

import type { EventItem, PackedEvent } from '@howljs/calendar-kit';

const colaboradores = [
  { id: '1', title: 'João', avatar: 'https://i.pravatar.cc/100?u=1' },
  { id: '2', title: 'Maria', avatar: 'https://i.pravatar.cc/100?u=2' },
  { id: '3', title: 'Carlos', avatar: 'https://i.pravatar.cc/100?u=3' },
];

const initialEvents: EventItem[] = [
  {
    id: '1',
    title: 'Reunião',
    start: { dateTime: new Date(2026, 0, 11, 9, 0).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 10, 0).toISOString() },
    resourceId: '1',
    color: '#4CAF50',
  },
  {
    id: '2',
    title: 'Planejamento',
    start: { dateTime: new Date(2026, 0, 11, 11, 0).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 12, 0).toISOString() },
    resourceId: '1',
    color: '#FF9800',
  },
  {
    id: '3',
    title: 'Atendimento',
    start: { dateTime: new Date(2026, 0, 11, 10, 0).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 11, 30).toISOString() },
    resourceId: '2',
    color: '#2196F3',
  },
  {
    id: '4',
    title: 'Treinamento',
    start: { dateTime: new Date(2026, 0, 11, 14, 0).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 16, 0).toISOString() },
    resourceId: '3',
    color: '#9C27B0',
  },
  {
    id: '5',
    title: 'Consulta',
    start: { dateTime: new Date(2026, 0, 11, 13, 30).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 14, 15).toISOString() },
    resourceId: '2',
    color: '#E91E63',
  },
  {
    id: '6',
    title: 'Retorno',
    start: { dateTime: new Date(2026, 0, 11, 15, 0).toISOString() },
    end: { dateTime: new Date(2026, 0, 11, 15, 30).toISOString() },
    resourceId: '3',
    color: '#00BCD4',
  },
];

const getISO = (dateOrDateTime: any) =>
  dateOrDateTime?.dateTime ||
  (dateOrDateTime?.date ? `${dateOrDateTime.date}T00:00:00` : undefined);

const formatTime = (dateOrDateTime: any) => {
  const iso = getISO(dateOrDateTime);
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
};

export default function App() {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<any | undefined>(undefined);
  const [lastTap, setLastTap] = useState<number>(0);
  const [lastTapEventId, setLastTapEventId] = useState<string | null>(null);
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Agenda do Dia – Todos os Colaboradores</Text>

      <CalendarContainer
       initialDate="2026-01-11"
  numberOfDays={1}
  resources={colaboradores}
  events={events}
  selectedEvent={selectedEvent}
  timeInterval={30}                // blocos de 30min
  initialTimeIntervalHeight={100}  // altura inicial — deixa os slots grandes
  minTimeIntervalHeight={100}      // impede que encolha
  maxTimeIntervalHeight={150} 
       
    

        onPressEvent={(event: any) => {
          const now = Date.now();
          const eid = String(event?.id || '');
          if (lastTapEventId === eid && now - lastTap < 350) {
            setSelectedEvent(event as any);
          } else {
            setDetailsEvent(event as any);
            setShowDetails(true);
          }
          setLastTap(now);
          setLastTapEventId(eid);
        }}
        onDragSelectedEventEnd={(event: any) => {
          const startISO =
            (event as any)?.start?.dateTime ||
            ((event as any)?.start?.date ? new Date(`${(event as any).start.date}T00:00:00`).toISOString() : undefined);
          const endISO =
            (event as any)?.end?.dateTime ||
            ((event as any)?.end?.date ? new Date(`${(event as any).end.date}T00:00:00`).toISOString() : undefined);
          const newResourceId = (event as any)?.resourceId;
          if (startISO && endISO) {
            setEvents((prev) =>
              prev.map((ev) =>
                ev.id === (event as any).id
                  ? { 
                      ...ev, 
                      start: { dateTime: startISO }, 
                      end: { dateTime: endISO },
                      resourceId: newResourceId ?? ev.resourceId
                    }
                  : ev
              )
            );
          }
          setSelectedEvent(undefined);
        }}
      >
        <CalendarHeader />
        <CalendarBody
        
          showNowIndicator
         renderEvent={(event: PackedEvent) => {
            const resource = colaboradores.find(c => c.id === event.resourceId);
            const uri = resource?.avatar || `https://i.pravatar.cc/100?u=${event.resourceId || event.id}`;
            return (
              <View style={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 6 }}>
                <Image source={{ uri }} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
                <Text style={{ color: '#fff', fontSize: 10 }} numberOfLines={1}>{event.title}</Text>
              </View>
            );
          }}
        />
      </CalendarContainer>
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              {detailsEvent?.title || 'Evento'}
            </Text>
            <Text style={{ marginBottom: 4 }}>
              Profissional: {colaboradores.find(c => c.id === detailsEvent?.resourceId)?.title || '-'}
            </Text>
            <Text style={{ marginBottom: 4 }}>
              Início: {formatTime(detailsEvent?.start)}
            </Text>
            <Text style={{ marginBottom: 12 }}>
              Fim: {formatTime(detailsEvent?.end)}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
              <Text style={{ color: '#1973E7', fontWeight: '600' }} onPress={() => setShowDetails(false)}>
                Fechar
              </Text>
              <Text
                style={{ color: '#1973E7', fontWeight: '600' }}
                onPress={() => {
                  if (detailsEvent) {
                    setSelectedEvent(detailsEvent as any);
                  }
                  setShowDetails(false);
                }}
              >
                Editar
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 90,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
});
