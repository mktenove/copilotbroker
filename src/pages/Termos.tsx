import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const Termos = () => {
  return (
    <>
      <Helmet>
        <title>Termos de Uso | Copilot Broker</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="container py-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Link>
          </div>
        </header>

        <main className="container py-12 md:py-20">
          <div className="max-w-3xl mx-auto space-y-16">
            
            <section id="politica-de-privacidade">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
                Política de Privacidade
              </h1>

              <div className="space-y-8 text-foreground/80">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">1. Controladora dos dados pessoais</h2>
                  <p>
                    A COPILOT BROKER, plataforma de gestão de relacionamento com clientes (CRM) para o mercado imobiliário, 
                    é a controladora dos dados pessoais coletados por meio desta plataforma, nos termos da 
                    Lei nº 13.709/2018 – Lei Geral de Proteção de Dados (LGPD).
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados pessoais coletados</h2>
                  <p className="mb-2">Por meio desta plataforma, poderão ser coletados os seguintes dados pessoais:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Nome</li>
                    <li>Email</li>
                    <li>Telefone (incluindo WhatsApp)</li>
                  </ul>
                  <p className="mt-2">Os dados são fornecidos voluntariamente pelo titular ou pelo corretor responsável.</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidade do tratamento dos dados</h2>
                  <p className="mb-2">Os dados pessoais coletados serão utilizados para as seguintes finalidades:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Gestão de leads e relacionamento comercial;</li>
                    <li>Envio de comunicações comerciais e informativas sobre empreendimentos imobiliários;</li>
                    <li>Automação de atendimento via WhatsApp;</li>
                    <li>Análise de desempenho e inteligência comercial.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">4. Base legal para o tratamento</h2>
                  <p className="mb-2">O tratamento dos dados pessoais ocorre com fundamento:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>No consentimento expresso do titular;</li>
                    <li>No legítimo interesse comercial, sempre respeitando os direitos e expectativas do titular.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">5. Compartilhamento de dados</h2>
                  <p className="mb-2">Os dados pessoais poderão ser compartilhados:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Com corretores associados à plataforma, para fins de atendimento e intermediação imobiliária;</li>
                    <li>Com prestadores de serviços de tecnologia e infraestrutura estritamente necessários.</li>
                  </ul>
                  <p className="mt-2">A Copilot Broker não comercializa dados pessoais.</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">6. Armazenamento e segurança</h2>
                  <p>
                    A Copilot Broker adota medidas técnicas e administrativas adequadas para proteger os dados pessoais contra 
                    acessos não autorizados, uso indevido, perda, alteração ou divulgação.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">7. Direitos do titular</h2>
                  <p className="mb-2">O titular poderá, a qualquer momento, solicitar:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Acesso aos seus dados;</li>
                    <li>Correção ou atualização;</li>
                    <li>Exclusão dos dados, quando aplicável;</li>
                    <li>Revogação do consentimento.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">8. Atualizações</h2>
                  <p>
                    Esta Política de Privacidade poderá ser alterada a qualquer tempo, sendo recomendada sua leitura periódica.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            <section id="termos-de-uso">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Termos de Uso
              </h1>
              <p className="text-muted-foreground mb-8">
                Plataforma Copilot Broker — CRM com IA para Corretores
              </p>

              <div className="space-y-8 text-foreground/80">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">1. Objeto</h2>
                  <p>
                    A Copilot Broker é uma plataforma de CRM com inteligência artificial voltada para corretores de imóveis
                    e imobiliárias, oferecendo gestão de leads, automação de comunicação via WhatsApp, e análise de desempenho comercial.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">2. Cadastro e acesso</h2>
                  <p className="mb-2">O usuário declara que:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>As informações fornecidas no cadastro são verdadeiras;</li>
                    <li>Possui capacidade legal para utilizar a plataforma;</li>
                    <li>É responsável pela confidencialidade de suas credenciais de acesso.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">3. Uso adequado</h2>
                  <p className="mb-2">O usuário compromete-se a:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Utilizar a plataforma em conformidade com a legislação vigente;</li>
                    <li>Não realizar envio de mensagens em massa não autorizadas (spam);</li>
                    <li>Respeitar a privacidade dos leads cadastrados na plataforma.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">4. Responsabilidades</h2>
                  <p className="mb-2">A Copilot Broker não se responsabiliza por:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Conteúdo das mensagens enviadas pelos usuários;</li>
                    <li>Resultados comerciais obtidos pelos corretores;</li>
                    <li>Interrupções temporárias por manutenção ou fatores externos.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">5. Propriedade intelectual</h2>
                  <p>
                    Todo o conteúdo da plataforma, incluindo design, código, marcas e funcionalidades, 
                    é de propriedade exclusiva da Copilot Broker, sendo vedada sua reprodução sem autorização prévia.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">6. Alterações</h2>
                  <p>
                    Estes Termos de Uso poderão ser modificados a qualquer momento. O uso continuado da plataforma
                    após alterações constitui aceitação dos novos termos.
                  </p>
                </div>
              </div>
            </section>

            <div className="text-center pt-8">
              <Link 
                to="/" 
                className="btn-primary inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Termos;
