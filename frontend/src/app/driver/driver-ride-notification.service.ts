
import { Injectable, signal } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { Subscription } from 'rxjs';
import { AuthService } from '../core/auth.service';

export interface RideRequestNotification {
  rideId: number;
  pickupAddress: string;
  dropAddress: string;
  rideType: string;
  estimatedFare: number;
  distanceKm: number;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class DriverRideNotificationService {
  readonly incomingRequests = signal<RideRequestNotification[]>([]);
  readonly connectionStatus = signal('Disconnected');

  private readonly client = new RxStomp();
  private started = false;
  private messageSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  constructor(private readonly authService: AuthService) {}

  connect(): void {
    if (this.started) {
      return;
    }

    const token = this.authService.token();

    if (!token) {
      this.connectionStatus.set('Not connected: please log in again');
      return;
    }

    this.started = true;
    this.connectionStatus.set('Connecting...');

    this.client.configure({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.connectionSubscription = this.client.connected$.subscribe(
      (connected) => {
        this.connectionStatus.set(
          connected ? 'Connected' : 'Disconnected',
        );
      },
    );

    this.messageSubscription = this.client
      .watch('/user/queue/ride-requests')
      .subscribe({
        next: (message) => {
          try {
            const request = JSON.parse(
              message.body,
            ) as RideRequestNotification;

            if (
              typeof request.rideId !== 'number' ||
              !request.pickupAddress ||
              !request.dropAddress
            ) {
              return;
            }

            this.incomingRequests.update((requests) => {
              if (requests.some((item) => item.rideId === request.rideId)) {
                return requests;
              }

              return [request, ...requests];
            });
          } catch {
            // Ignore malformed messages; do not break the connection.
          }
        },
        error: () => {
          this.connectionStatus.set('Notification stream error');
        },
      });

    this.client.activate();
  }

  removeRequest(rideId: number): void {
    this.incomingRequests.update((requests) =>
      requests.filter((request) => request.rideId !== rideId),
    );
  }

  disconnect(): void {
    this.messageSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();

    this.messageSubscription = undefined;
    this.connectionSubscription = undefined;

    if (this.started) {
      void this.client.deactivate();
    }

    this.started = false;
    this.connectionStatus.set('Disconnected');
  }
}
