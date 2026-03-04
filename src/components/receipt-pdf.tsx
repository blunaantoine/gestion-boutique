'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { formatPrice } from '@/lib/currency';

// Enregistrer les polices pour le PDF
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v18/mem8YaGs126MiZpBA-UFVZ0b.woff2' },
  ],
});

// Styles pour le reçu PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 20,
    maxWidth: 280,
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
    borderBottom: '1 dashed #000',
    paddingBottom: 10,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  shopInfo: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 9,
  },
  divider: {
    borderBottom: '1 dashed #000',
    marginVertical: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 5,
    borderBottom: '1 solid #000',
    marginBottom: 5,
    fontSize: 9,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
  },
  itemName: {
    flex: 2,
  },
  itemQty: {
    width: 40,
    textAlign: 'center',
  },
  itemPrice: {
    width: 60,
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 10,
    paddingTop: 5,
    borderTop: '1 solid #000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '1 solid #000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  thankYou: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 9,
  },
});

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptData {
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  receiptNumber: string;
  date: string;
  time: string;
  cashier: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  paymentMethod: string;
  total: number;
}

interface ReceiptPDFProps {
  data: ReceiptData;
}

export function ReceiptPDF({ data }: ReceiptPDFProps) {
  return (
    <Document>
      <Page size={[280, undefined]} style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.shopName}>{data.shopName}</Text>
          {data.shopAddress && (
            <Text style={styles.shopInfo}>{data.shopAddress}</Text>
          )}
          {data.shopPhone && (
            <Text style={styles.shopInfo}>Tél: {data.shopPhone}</Text>
          )}
        </View>

        {/* Titre reçu */}
        <Text style={styles.title}>Reçu de Vente</Text>

        {/* Infos vente */}
        <View style={styles.infoRow}>
          <Text>N°: {data.receiptNumber}</Text>
          <Text>Date: {data.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text>Heure: {data.time}</Text>
          <Text>Vendeur: {data.cashier}</Text>
        </View>
        {data.customerName && (
          <View style={styles.infoRow}>
            <Text>Client: {data.customerName}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* En-tête articles */}
        <View style={styles.itemsHeader}>
          <Text style={styles.itemName}>Article</Text>
          <Text style={styles.itemQty}>Qté</Text>
          <Text style={styles.itemPrice}>Prix</Text>
        </View>

        {/* Liste des articles */}
        {data.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>{formatPrice(item.subtotal)}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>Sous-total:</Text>
            <Text>{formatPrice(data.subtotal)}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Text>Paiement:</Text>
            <Text>{data.paymentMethod}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>TOTAL:</Text>
            <Text>{formatPrice(data.total)}</Text>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>Merci de votre visite !</Text>
          <Text>À bientôt</Text>
          <Text style={{ marginTop: 10, fontSize: 7 }}>
            Document généré électroniquement
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Fonction pour générer les données du reçu
export function generateReceiptData(
  sale: {
    id: string;
    createdAt: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string | null;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      product?: { name: string } | null;
    }>;
  },
  shopName: string,
  cashierName: string,
  shopPhone?: string,
  shopAddress?: string
): ReceiptData {
  const date = new Date(sale.createdAt);
  const items: ReceiptItem[] = (sale.items || []).map((item) => ({
    productName: item.product?.name || 'Produit inconnu',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));

  return {
    shopName,
    shopPhone,
    shopAddress,
    receiptNumber: sale.id.slice(-8).toUpperCase(),
    date: date.toLocaleDateString('fr-FR'),
    time: date.toLocaleTimeString('fr-FR'),
    cashier: cashierName,
    customerName: sale.customerName || undefined,
    items,
    subtotal: sale.totalAmount,
    paymentMethod: sale.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money',
    total: sale.totalAmount,
  };
}
