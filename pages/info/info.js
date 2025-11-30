import { useState } from 'react';
import { ChevronDown, ArrowLeft, Youtube, Send } from 'lucide-react';

export default function InfoPage() {
  const [activeTab, setActiveTab] = useState('about');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const sections = {
    about: {
      title: 'Biz Haqimizda',
      content: 'MochiTV - bu eng zo\'r tarjima qilingan animelarni tomosha qilish uchun mo\'ljallangan platforma. Biz har kuni yangi, sifatli va interesting animeler qo\'shib boramiz.'
    },
    contact: {
      title: 'Aloqa',
      content: 'Agar sizda savollar yoki takliflar bo\'lsa, bizga quyidagi yo\'llar bilan bog\'lanishingiz mumkin:\n\n Telefon: +998 (90) 348-41-40\n💬 Telegram: @mochitv_uz'
    },
    report: {
      title: 'Muammo Xabar Qilish',
      content: 'Agar siz har qanday texnik muammo, noto\'g\'ri kontentni topgan bo\'lsangiz yoki boshqa shikoyatlar bo\'lsa, iltimos biz bilan bog\'lanishingiz. Sizning xabari biz uchun juda muhim va biz tez orada javob beramiz.'
    },
    terms: {
      title: 'Shartlar va Shartlar',
      content: 'MochiTV platformasini foydalanish sharti shundan iboratki, siz ushbu shartlarni qabul qilasiz:\n\n• Platforma faqat 13 yoshdan katta odam uchun mo\'ljallangan\n• Siz faqat shaxsiy foydalanish uchun kontentni ko\'rishingiz mumkin\n• Kontentni boshqa joyga nusxalash yoki tarqatish taqiqlanadi\n• MochiTV har qanday vaqtda shartlarni o\'zgartirishga huquqi bor'
    }
  };

  const faqs = [
    {
      id: 1,
      question: 'MochiTV nima?',
      answer: 'MochiTV - bu eng zo\'r tarjima qilingan animelarni onlayn tomosha qilish uchun mo\'ljallangan platforma. Biz turli janrda va turli til tavarruqida animelar taklif qilamiz.'
    },
    {
      id: 2,
      question: 'Qanday sharhga ruxsat berish kerak?',
      answer: 'MochiTV platformasini foydalanish uchun ro\'yxatdan o\'tishingiz kerak. Bu bepul va juda sodda. Faqat username va parolingizni kiriting.'
    },
    {
      id: 3,
      question: 'Hisob ochildi. Nima qilish kerak?',
      answer: 'Agar sizning hisobingiz ochib qo\'yilgan bo\'lsa, tezda bizga murojaat qiling. Biz hisobingizni qayta tiklashga yordam beramiz.'
    },
    {
      id: 4,
      question: 'Animeler barcha paytda mavjud boladimi?',
      answer: 'Ha, MochiTV-da barcha animeler 24/7 mavjud. Siz istalgan vaqtda ko\'rishingiz mumkin.'
    },
    {
      id: 5,
      question: 'Saralanganlar qanday saqlaladi?',
      answer: 'Siz saralanganlar ro\'yxatiga qo\'shgan animelar hisobingizda saqlanadi. Siz har qanday vaqtda ularni ko\'rishingiz yoki o\'chirishingiz mumkin.'
    },
    {
      id: 6,
      question: 'MochiTV telefondan ham foydalanish mumkinmi?',
      answer: 'Ha, MochiTV platforma mobil cihozlar uchun optimalashtirilgan. Siz telefondan yoki planshetdan osongina foydalanishingiz mumkin.'
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div style={styles.container}>
     <style>{`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;
    background: #000000;
    color: #ffffff;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(59, 130, 246, 0.6);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-track {
    background-color: rgba(255, 255, 255, 0.05);
  }
`}</style>


      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => window.history.back()}>
          <ArrowLeft size={24} />
          <span>Orqaga</span>
        </button>
        <h1 style={styles.headerTitle}>MochiTV - Malumot</h1>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Navigation Tabs */}
        <div style={styles.tabsContainer}>
          {Object.keys(sections).map(key => (
            <button
              key={key}
              style={{
                ...styles.tab,
                ...(activeTab === key ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(key)}
            >
              {sections[key].title}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div style={styles.contentArea}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>{sections[activeTab].title}</h2>
            <p style={styles.sectionContent}>{sections[activeTab].content}</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Tez-tez Soraladigan Savollar (FAQ)</h2>
          <div style={styles.faqContainer}>
            {faqs.map(faq => (
              <div key={faq.id} style={styles.faqItem}>
                <button
                  style={styles.faqQuestion}
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span style={styles.faqText}>{faq.question}</span>
                  <ChevronDown
                    size={20}
                    style={{
                      transform: expandedFaq === faq.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s'
                    }}
                  />
                </button>
                {expandedFaq === faq.id && (
                  <div style={styles.faqAnswer}>
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        

        {/* Footer */}
        <div style={styles.footer}>
          <p>&copy; 2025 MochiTV. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #000000 0%, #0f0f23 100%)',
    color: '#ffffff',
    paddingBottom: '60px'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(0, 0, 0, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '15px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  backBtn: {
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.5)',
    color: '#3b82f6',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  tabsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '30px'
  },
  tab: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    color: '#fff'
  },
  contentArea: {
    marginBottom: '30px'
  },
  section: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    backdropFilter: 'blur(10px)'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  sectionContent: {
    fontSize: '16px',
    lineHeight: '1.8',
    color: 'rgba(255, 255, 255, 0.8)',
    whiteSpace: 'pre-wrap'
  },
  faqContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  faqItem: {
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  faqQuestion: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#fff',
    transition: 'all 0.3s'
  },
  faqText: {
    textAlign: 'left'
  },
  faqAnswer: {
    background: 'rgba(59, 130, 246, 0.1)',
    borderTop: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.7)',
    animation: 'slideDown 0.3s ease-out'
  },
  socialsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  socialLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.5)',
    color: '#3b82f6',
    padding: '12px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  footer: {
    textAlign: 'center',
    paddingTop: '30px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px'
  }
};