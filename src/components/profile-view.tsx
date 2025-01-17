import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  GraduationCap, 
  Award, 
  Star, 
  Mail, 
  Github, 
  Linkedin,
  MapPin,
  Calendar,
  Download
} from 'lucide-react';

interface Experience {
  title: string;
  company: string;
  period: string;
  location: string;
  achievements: string[];
}

interface Education {
  degree: string;
  institution: string;
  year: string;
  honors: string[];
}

interface Certification {
  name: string;
  issuer: string;
  year: string;
  id: string;
}

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<'experience' | 'education' | 'skills'>('experience');

  const experience: Experience[] = [
    {
      title: "Senior Data Dictionary Architect",
      company: "Enterprise Data Solutions Inc.",
      period: "2020 - Present",
      location: "San Francisco, CA",
      achievements: [
        "Led development of enterprise-wide data dictionary platform serving 500+ users",
        "Implemented automated metadata management reducing documentation time by 60%",
        "Designed scalable data governance framework adopted by 3 Fortune 500 clients"
      ]
    },
    {
      title: "Data Governance Specialist",
      company: "Global Financial Services",
      period: "2018 - 2020",
      location: "New York, NY",
      achievements: [
        "Established data quality standards improving data accuracy by 40%",
        "Created comprehensive data lineage documentation for regulatory compliance",
        "Led team of 5 data analysts in metadata management initiatives"
      ]
    }
  ];

  const education: Education[] = [
    {
      degree: "Master of Science in Data Science",
      institution: "Stanford University",
      year: "2018",
      honors: [
        "Thesis: 'Automated Metadata Management in Enterprise Systems'",
        "GPA: 3.95/4.0",
        "Data Science Merit Scholar"
      ]
    },
    {
      degree: "Bachelor of Science in Computer Science",
      institution: "University of California, Berkeley",
      year: "2016",
      honors: [
        "Magna Cum Laude",
        "Dean's List: All Semesters",
        "Senior Project: 'Intelligent Data Dictionary System'"
      ]
    }
  ];

  const certifications: Certification[] = [
    {
      name: "Certified Data Management Professional (CDMP)",
      issuer: "DAMA International",
      year: "2021",
      id: "CDMP-2021-1234"
    },
    {
      name: "AWS Certified Data Analytics",
      issuer: "Amazon Web Services",
      year: "2020",
      id: "AWS-DA-2020-5678"
    }
  ];

  const skills = [
    { category: "Data Management", items: ["Data Modeling", "Metadata Management", "Data Governance", "Master Data Management"] },
    { category: "Technologies", items: ["SQL", "Python", "TypeScript", "React", "Node.js", "AWS", "Supabase"] },
    { category: "Tools", items: ["JIRA", "Confluence", "Git", "Docker", "Kubernetes"] },
    { category: "Soft Skills", items: ["Leadership", "Communication", "Problem Solving", "Team Management"] }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Sarah Chen</h1>
            <p className="text-muted-foreground mb-4">
              Senior Data Dictionary Architect & Data Governance Specialist
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                San Francisco, CA
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-1" />
                sarah.chen@example.com
              </div>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Resume
          </Button>
        </div>
        <div className="flex gap-4 mt-4">
          <Button variant="ghost" size="sm">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <Button variant="ghost" size="sm">
            <Linkedin className="h-4 w-4 mr-2" />
            LinkedIn
          </Button>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'experience' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('experience')}
          className="rounded-none border-b-2 border-transparent"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Experience
        </Button>
        <Button
          variant={activeTab === 'education' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('education')}
          className="rounded-none border-b-2 border-transparent"
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Education
        </Button>
        <Button
          variant={activeTab === 'skills' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('skills')}
          className="rounded-none border-b-2 border-transparent"
        >
          <Star className="h-4 w-4 mr-2" />
          Skills
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[600px] pr-4">
        {activeTab === 'experience' && (
          <div className="space-y-6">
            {experience.map((exp, index) => (
              <Card key={index} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{exp.title}</h3>
                    <p className="text-muted-foreground">{exp.company}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {exp.period}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {exp.location}
                    </div>
                  </div>
                </div>
                <ul className="list-disc list-inside space-y-2">
                  {exp.achievements.map((achievement, i) => (
                    <li key={i} className="text-sm">{achievement}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-6">
            {education.map((edu, index) => (
              <Card key={index} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{edu.degree}</h3>
                    <p className="text-muted-foreground">{edu.institution}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {edu.year}
                    </div>
                  </div>
                </div>
                <ul className="list-disc list-inside space-y-2">
                  {edu.honors.map((honor, i) => (
                    <li key={i} className="text-sm">{honor}</li>
                  ))}
                </ul>
              </Card>
            ))}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications
              </h3>
              <div className="grid gap-4">
                {certifications.map((cert, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                      </div>
                      <Badge variant="secondary">{cert.year}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="grid gap-6">
            {skills.map((category, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold mb-4">{category.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.items.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}